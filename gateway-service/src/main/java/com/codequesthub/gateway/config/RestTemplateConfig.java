package com.codequesthub.gateway.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

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
     */
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
            .requestFactory(() -> new JdkClientHttpRequestFactory())
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
