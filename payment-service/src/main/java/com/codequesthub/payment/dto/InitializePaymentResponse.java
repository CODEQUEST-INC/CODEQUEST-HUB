package com.codequesthub.payment.dto;

public class InitializePaymentResponse {
    private final String authorizationUrl;
    private final String reference;

    public InitializePaymentResponse(String authorizationUrl, String reference) {
        this.authorizationUrl = authorizationUrl;
        this.reference = reference;
    }

    public String getAuthorizationUrl() { return authorizationUrl; }
    public String getReference() { return reference; }
}
