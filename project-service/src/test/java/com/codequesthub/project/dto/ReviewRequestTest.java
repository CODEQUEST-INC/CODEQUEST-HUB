package com.codequesthub.project.dto;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReviewRequestTest {

    private ReviewRequest requestOf(String action, String feedback) {
        ReviewRequest req = new ReviewRequest();
        req.setAction(action);
        req.setFeedback(feedback);
        return req;
    }

    @Test
    void rejected_withNoFeedback_isInvalid() {
        assertThat(requestOf("rejected", null).isValid()).isFalse();
    }

    @Test
    void rejected_withTooShortFeedback_isInvalid() {
        assertThat(requestOf("rejected", "too short").isValid()).isFalse();
    }

    @Test
    void rejected_withSufficientFeedback_isValid() {
        assertThat(requestOf("rejected", "Please add more detail to the tech stack section.").isValid()).isTrue();
    }

    @Test
    void changesRequested_withNoFeedback_isInvalid() {
        assertThat(requestOf("changes_requested", null).isValid()).isFalse();
    }

    @Test
    void approved_withNoFeedback_isValid() {
        assertThat(requestOf("approved", null).isValid()).isTrue();
    }
}
