package com.codequesthub.gateway.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
public class RestTemplateConfig {

    /**
     * Downstream 4xx/5xx responses must be relayed to the caller as-is, not turned into
     * RestTemplate exceptions — the gateway is a transparent proxy, not a validator.
     *
     * Uses JdkClientHttpRequestFactory (java.net.http.HttpClient) rather than the default
     * SimpleClientHttpRequestFactory, which is backed by HttpURLConnection — HttpURLConnection
     * has never supported the PATCH method (java.net.ProtocolException: Invalid HTTP method:
     * PATCH), which would silently break every PATCH-based edit endpoint behind this gateway.
     *
     * Explicit connect/read timeouts matter here specifically: ResourceAccessException (caught
     * in GatewayController to return a clean 503) only fires for a refused/failed connection or
     * a timeout actually expiring — with no timeout configured, a downstream that accepts the
     * connection but simply never responds would hang the gateway request indefinitely instead
     * of failing fast. JdkClientHttpRequestFactory has no setConnectTimeout — that has to be set
     * on the underlying HttpClient itself before the factory is built around it.
     */
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
            .requestFactory(() -> {
                HttpClient httpClient = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
                    .build();
                JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
                factory.setReadTimeout(Duration.ofSeconds(30));
                return factory;
            })
            .errorHandler(new org.springframework.web.client.ResponseErrorHandler() {
                @Override
                public boolean hasError(ClientHttpResponse response) {
                    return false;
                }

                @Override
                public void handleError(ClientHttpResponse response) {
                }
            }).build();
    }
}
