package com.codequesthub.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Not a Spring bean here (see JwtUtil) — each service constructs it via an
 * explicit @Bean in its own SecurityConfig, passing its own JwtUtil instance.
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    // Read by JsonAuthenticationEntryPoint to explain *why* authentication
    // failed — a totally unauthenticated request is rejected by Spring
    // Security before it ever reaches a controller/GlobalExceptionHandler,
    // so this is the only way that reason survives to the response body.
    public static final String AUTH_ERROR_ATTRIBUTE = "com.codequesthub.authError";

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            req.setAttribute(AUTH_ERROR_ATTRIBUTE,
                "Authentication required — include a valid Bearer token in the Authorization header");
        } else {
            String token = header.substring(7);
            try {
                Claims claims = jwtUtil.parseToken(token);
                String role = claims.get("role", String.class);
                var auth = new UsernamePasswordAuthenticationToken(
                    claims.getSubject(), null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                auth.setDetails(claims);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (ExpiredJwtException e) {
                req.setAttribute(AUTH_ERROR_ATTRIBUTE, "Your session has expired — please log in again");
            } catch (JwtException | IllegalArgumentException e) {
                req.setAttribute(AUTH_ERROR_ATTRIBUTE, "Invalid authentication token — please log in again");
            }
        }
        chain.doFilter(req, res);
    }
}
