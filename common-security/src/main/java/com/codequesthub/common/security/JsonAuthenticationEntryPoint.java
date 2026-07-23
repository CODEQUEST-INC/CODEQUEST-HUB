package com.codequesthub.common.security;

import com.codequesthub.common.web.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * A request with no/invalid/expired token is rejected by Spring Security's
 * filter chain before it ever reaches a controller, so GlobalExceptionHandler
 * (a @RestControllerAdvice) never sees it — without this, the client got a
 * bare {timestamp,status,error,path} with no explanation at all. JwtAuthFilter
 * stashes the specific reason as a request attribute; this reads it back out
 * and writes the same ApiError JSON shape used everywhere else in the API.
 */
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    // This entry point runs inside Spring Security's filter chain, before Spring MVC
    // ever gets involved, so it can't reuse the application's auto-configured (and
    // JSR-310-aware) ObjectMapper bean — findAndRegisterModules() picks up the same
    // jackson-datatype-jsr310 module Spring Boot would (it's already on the classpath
    // as a Boot Starter dependency), so ApiError's Instant timestamp field serializes
    // correctly instead of throwing InvalidDefinitionException.
    private final ObjectMapper objectMapper = new ObjectMapper()
        .findAndRegisterModules()
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                          AuthenticationException authException) throws IOException {
        Object reason = request.getAttribute(JwtAuthFilter.AUTH_ERROR_ATTRIBUTE);
        String message = reason != null
            ? reason.toString()
            : "Authentication required — include a valid Bearer token in the Authorization header";

        ApiError body = new ApiError(HttpStatus.UNAUTHORIZED.value(), HttpStatus.UNAUTHORIZED.getReasonPhrase(),
            message, request.getRequestURI());

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
