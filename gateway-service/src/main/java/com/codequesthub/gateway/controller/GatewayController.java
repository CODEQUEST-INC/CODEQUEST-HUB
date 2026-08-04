package com.codequesthub.gateway.controller;

import com.codequesthub.gateway.filter.RequestLoggingFilter;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.net.URI;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Thin reverse proxy: routes by path prefix to the backend service that owns it.
 * Each backend already validates its own JWT, so this layer does no auth — it
 * just forwards the request/response verbatim.
 */
@RestController
public class GatewayController {

    private static final Set<String> EXCLUDED_REQUEST_HEADERS = Set.of("host", "content-length", "connection");
    // content-length/content-encoding are excluded because RestTemplate may transparently
    // decompress a gzip'd downstream response while leaving those headers describing the
    // original compressed body — forwarding them verbatim then mismatches the actual bytes
    // written here, which edge proxies (Render's Cloudflare front door) reject outright.
    private static final Set<String> EXCLUDED_RESPONSE_HEADERS =
        Set.of("transfer-encoding", "connection", "content-length", "content-encoding");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final RestTemplate restTemplate;
    private final List<Route> routes;

    // Mirrors each downstream service's own spring.servlet.multipart.max-request-size —
    // duplicated here deliberately (see the size check below for why).
    private static final long GROUP_MAX_BYTES = 5L * 1024 * 1024;
    private static final long PROJECT_MAX_BYTES = 15L * 1024 * 1024;
    private static final long SHOWCASE_MAX_BYTES = 5L * 1024 * 1024;

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
                new Route("/api/auth", authServiceUrl, null),
                new Route("/api/groups", groupServiceUrl, GROUP_MAX_BYTES),
                new Route("/api/cohorts", groupServiceUrl, null),
                new Route("/api/proposals", projectServiceUrl, PROJECT_MAX_BYTES),
                new Route("/api/tasks", taskServiceUrl, null),
                new Route("/api/judging", judgingServiceUrl, null),
                new Route("/api/showcase", showcaseServiceUrl, SHOWCASE_MAX_BYTES),
                new Route("/api/payments", paymentServiceUrl, null)
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
            return buildErrorResponse(HttpStatus.NOT_FOUND, "No route configured for this path", path);
        }

        String query = request.getQueryString();
        String targetUrl = route.baseUrl() + path + (query != null ? "?" + query : "");
        // request.getQueryString() is already percent-encoded (e.g. "q=QA%20Student").
        // RestTemplate.exchange(String, ...) treats a plain String as a URI *template*
        // and re-encodes it, mangling anything already escaped (spaces silently turn
        // into something that matches nothing downstream, with no error at all).
        // URI.create() parses the string as an already-fully-encoded URI verbatim, and
        // the URI-typed exchange() overload skips template encoding entirely.
        URI targetUri = URI.create(targetUrl);

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

        // Reject an oversized body here rather than proxying it: sending a large body
        // through RestTemplate's JDK HttpClient to a downstream service that rejects it
        // early (before the body finishes sending) makes the client abort the write with
        // an IOException — surfacing as a bare 503 with no message, since by then the
        // downstream's own friendly 413 response was never received. Checking the limit
        // up front lets the gateway return that same friendly shape itself instead.
        if (route.maxBodyBytes() != null && body.length > route.maxBodyBytes()) {
            String message = "File is too large — the limit is " + (route.maxBodyBytes() / (1024 * 1024)) + "MB";
            return buildErrorResponse(HttpStatus.PAYLOAD_TOO_LARGE, message, path);
        }

        HttpEntity<byte[]> entity = new HttpEntity<>(body.length > 0 ? body : null, headers);

        ResponseEntity<byte[]> response;
        try {
            response = restTemplate.exchange(targetUri, HttpMethod.valueOf(request.getMethod()), entity, byte[].class);
        } catch (ResourceAccessException e) {
            String message = "The service handling " + route.prefix() + " is currently unavailable — please try again";
            return buildErrorResponse(HttpStatus.SERVICE_UNAVAILABLE, message, path);
        }

        HttpHeaders responseHeaders = new HttpHeaders();
        response.getHeaders().forEach((name, values) -> {
            if (!EXCLUDED_RESPONSE_HEADERS.contains(name.toLowerCase())) {
                responseHeaders.put(name, values);
            }
        });

        return new ResponseEntity<>(response.getBody(), responseHeaders, response.getStatusCode());
    }

    // This controller isn't wired into common-security's GlobalExceptionHandler/ApiError
    // (the gateway does no auth/validation of its own, just proxies), so its handful of
    // own error responses build the same {status,error,message,path} JSON shape directly,
    // via Jackson rather than hand-built string concatenation so any special characters
    // in the message/path are escaped correctly.
    private ResponseEntity<byte[]> buildErrorResponse(HttpStatus status, String message, String path) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        body.put("path", path);
        byte[] json;
        try {
            json = OBJECT_MAPPER.writeValueAsBytes(body);
        } catch (JsonProcessingException e) {
            json = "{}".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        }
        return ResponseEntity.status(status)
            .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .body(json);
    }

    private record Route(String prefix, String baseUrl, Long maxBodyBytes) {
    }
}
