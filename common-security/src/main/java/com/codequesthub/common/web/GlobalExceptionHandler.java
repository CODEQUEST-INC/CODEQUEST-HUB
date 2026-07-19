package com.codequesthub.common.web;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Every service throws ResponseStatusException with a human-readable reason, but Spring
 * Boot's default error handling drops that reason from the response body unless explicitly
 * configured — callers were only ever seeing {timestamp, status, error, path} with no detail
 * at all. This puts the reason (and field-level validation errors) into a single consistent
 * shape across all services.
 *
 * Not a Spring bean here — each service's main class explicitly @Imports it, the same way
 * JwtUtil/JwtAuthFilter are wired, since this package sits outside any service's
 * component-scan base package.
 *
 * Note: a completely unauthenticated request (no token at all) is rejected by Spring
 * Security's filter chain before DispatcherServlet ever dispatches to a controller, so it
 * never reaches this advice and still gets Spring's default error body. Only failures that
 * occur during/after controller dispatch — business-rule rejections, validation failures,
 * and @PreAuthorize role denials on an authenticated request — are normalized here.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        ApiError body = new ApiError(HttpStatus.FORBIDDEN.value(), HttpStatus.FORBIDDEN.getReasonPhrase(),
            "You do not have permission to perform this action", request.getRequestURI());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        ApiError body = new ApiError(status.value(), status.getReasonPhrase(), ex.getReason(), request.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }

    // e.g. assigning a group member/supervisor/judge by a user ID that doesn't exist —
    // the FK violation would otherwise surface as an unhandled 500.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrityViolation(DataIntegrityViolationException ex, HttpServletRequest request) {
        ApiError body = new ApiError(HttpStatus.BAD_REQUEST.value(), HttpStatus.BAD_REQUEST.getReasonPhrase(),
            "Request references data that doesn't exist or violates a constraint", request.getRequestURI());
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .collect(Collectors.joining("; "));
        ApiError body = new ApiError(HttpStatus.BAD_REQUEST.value(), HttpStatus.BAD_REQUEST.getReasonPhrase(), message, request.getRequestURI());
        return ResponseEntity.badRequest().body(body);
    }

    // Jackson rejects the request body before it ever reaches a controller/validation
    // (e.g. a "dueDate" field that isn't valid ISO-8601) — by default this comes back as a
    // bare 400 with no message at all, which read to users as an unexplained "Bad Request".
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleNotReadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        String message = "Request body is malformed";
        Throwable cause = ex.getCause();
        if (cause instanceof InvalidFormatException ife) {
            String field = ife.getPath().isEmpty()
                ? "value"
                : ife.getPath().get(ife.getPath().size() - 1).getFieldName();
            Class<?> targetType = ife.getTargetType();
            if (targetType == LocalDate.class) {
                message = field + ": \"" + ife.getValue() + "\" is not a valid date — use YYYY-MM-DD (e.g. 2026-07-19)";
            } else if (targetType == LocalDateTime.class) {
                message = field + ": \"" + ife.getValue() + "\" is not a valid date/time — use YYYY-MM-DDTHH:mm:ss";
            } else if (targetType != null && targetType.isEnum()) {
                message = field + ": \"" + ife.getValue() + "\" is not valid — must be one of "
                    + Arrays.toString(targetType.getEnumConstants());
            } else {
                message = field + ": \"" + ife.getValue() + "\" is not a valid value";
            }
        } else if (cause instanceof DateTimeParseException dtpe) {
            message = "\"" + dtpe.getParsedString() + "\" is not a valid date — use YYYY-MM-DD (e.g. 2026-07-19)";
        }
        ApiError body = new ApiError(HttpStatus.BAD_REQUEST.value(), HttpStatus.BAD_REQUEST.getReasonPhrase(), message, request.getRequestURI());
        return ResponseEntity.badRequest().body(body);
    }

    // A required multipart part (e.g. a PDF/photo attachment) was left off the
    // request entirely — Spring rejects this before the controller method body
    // (and its own "is required" checks) ever run.
    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ApiError> handleMissingPart(MissingServletRequestPartException ex, HttpServletRequest request) {
        String message = "Missing required part \"" + ex.getRequestPartName() + "\"";
        ApiError body = new ApiError(HttpStatus.BAD_REQUEST.value(), HttpStatus.BAD_REQUEST.getReasonPhrase(), message, request.getRequestURI());
        return ResponseEntity.badRequest().body(body);
    }

    // An uploaded file exceeded spring.servlet.multipart.max-file-size —
    // otherwise surfaces as a bare 413 with no explanation of the actual limit.
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> handleMaxUploadSize(MaxUploadSizeExceededException ex, HttpServletRequest request) {
        String message = "File is too large";
        long maxSize = ex.getMaxUploadSize();
        if (maxSize > 0) {
            message += " — the limit is " + (maxSize / (1024 * 1024)) + "MB";
        }
        ApiError body = new ApiError(HttpStatus.PAYLOAD_TOO_LARGE.value(), HttpStatus.PAYLOAD_TOO_LARGE.getReasonPhrase(), message, request.getRequestURI());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(body);
    }
}
