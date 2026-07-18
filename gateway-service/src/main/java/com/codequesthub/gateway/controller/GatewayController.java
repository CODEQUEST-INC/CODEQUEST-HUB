package com.codequesthub.gateway.controller;

import com.codequesthub.gateway.filter.RequestLoggingFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Set;

/**
 * Thin reverse proxy: routes by path prefix to the backend service that owns it.
 * Each backend already validates its own JWT, so this layer does no auth — it
 * just forwards the request/response verbatim.
 */
@RestController
public class GatewayController {

    private static final Set<String> EXCLUDED_REQUEST_HEADERS = Set.of("host", "content-length", "connection");
    private static final Set<String> EXCLUDED_RESPONSE_HEADERS = Set.of("transfer-encoding", "connection");

    private final RestTemplate restTemplate;
    private final List<Route> routes;

    public GatewayController(RestTemplate restTemplate,
                              @Value("${auth.service.url}") String authServiceUrl,
                              @Value("${group.service.url}") String groupServiceUrl,
                              @Value("${project.service.url}") String projectServiceUrl,
                              @Value("${task.service.url}") String taskServiceUrl,
                              @Value("${judging.service.url}") String judgingServiceUrl,
                      @Value("${showcase.service.url}") String showcaseServiceUrl,
                      @Value("${payment.service.url}") String paymentServiceUrl) {
        this.restTemplate = restTemplate;
        this.routes = List.of(
                new Route("/api/auth", authServiceUrl),
                new Route("/api/groups", groupServiceUrl),
                new Route("/api/cohorts", groupServiceUrl),
                new Route("/api/proposals", projectServiceUrl),
                new Route("/api/tasks", taskServiceUrl),
                new Route("/api/judging", judgingServiceUrl),
            new Route("/api/showcase", showcaseServiceUrl),
            new Route("/api/payments", paymentServiceUrl)
        );
    }

    @RequestMapping(value = "/api/**", method = {
            RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE
    })
    public ResponseEntity<byte[]> proxy(HttpServletRequest request) throws IOException {
        String path = request.getRequestURI();

        // Match the bare prefix itself (e.g. "/api/showcase") as well as sub-paths
        // ("/api/showcase/123") — a path must not be allowed to match by sharing a string
        // prefix without the separator (e.g. "/api/showcase2").
        Route route = routes.stream()
                .filter(r -> path.equals(r.prefix()) || path.startsWith(r.prefix() + "/"))
                .findFirst()
                .orElse(null);

        if (route == null) {
            return ResponseEntity.notFound().build();
        }

        String query = request.getQueryString();
        String targetUrl = route.baseUrl() + path + (query != null ? "?" + query : "");

        HttpHeaders headers = new HttpHeaders();
        Collections.list(request.getHeaderNames()).forEach(name -> {
            if (!EXCLUDED_REQUEST_HEADERS.contains(name.toLowerCase())) {
                Collections.list(request.getHeaders(name)).forEach(value -> headers.add(name, value));
            }
        });
        if (!headers.containsKey(RequestLoggingFilter.REQUEST_ID_HEADER)) {
            Object requestId = request.getAttribute(RequestLoggingFilter.REQUEST_ID_ATTRIBUTE);
            if (requestId != null) {
                headers.add(RequestLoggingFilter.REQUEST_ID_HEADER, requestId.toString());
            }
        }

        byte[] body = request.getInputStream().readAllBytes();
        HttpEntity<byte[]> entity = new HttpEntity<>(body.length > 0 ? body : null, headers);

        ResponseEntity<byte[]> response;
        try {
            response = restTemplate.exchange(targetUrl, HttpMethod.valueOf(request.getMethod()), entity, byte[].class);
        } catch (ResourceAccessException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }

        HttpHeaders responseHeaders = new HttpHeaders();
        response.getHeaders().forEach((name, values) -> {
            if (!EXCLUDED_RESPONSE_HEADERS.contains(name.toLowerCase())) {
                responseHeaders.put(name, values);
            }
        });

        return new ResponseEntity<>(response.getBody(), responseHeaders, response.getStatusCode());
    }

    private record Route(String prefix, String baseUrl) {
    }
}
