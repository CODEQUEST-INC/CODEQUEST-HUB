package com.codequesthub.common.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

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

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .collect(Collectors.joining("; "));
        ApiError body = new ApiError(HttpStatus.BAD_REQUEST.value(), HttpStatus.BAD_REQUEST.getReasonPhrase(), message, request.getRequestURI());
        return ResponseEntity.badRequest().body(body);
    }
}
