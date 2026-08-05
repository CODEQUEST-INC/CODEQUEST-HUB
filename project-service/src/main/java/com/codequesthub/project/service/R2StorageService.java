package com.codequesthub.project.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.net.URI;

// Cloudflare R2 (S3-compatible object storage) — replaces local-disk file
// storage, which Render's ephemeral containers wipe on every redeploy.
// Mirrors group-service/showcase-service's own copy of this class — each
// service keeps its own, no shared storage module exists in this codebase.
@Service
public class R2StorageService {

    private final S3Client client;
    private final String bucket;

    public R2StorageService(@Value("${r2.account-id}") String accountId,
                             @Value("${r2.access-key-id}") String accessKeyId,
                             @Value("${r2.secret-access-key}") String secretAccessKey,
                             @Value("${r2.bucket}") String bucket) {
        this.bucket = bucket;
        this.client = S3Client.builder()
            .endpointOverride(URI.create("https://" + accountId + ".r2.cloudflarestorage.com"))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
            // R2 ignores the region value but the SDK requires one.
            .region(Region.of("auto"))
            // R2-specific: the SDK's default chunked transfer encoding for
            // putObject causes a signature-mismatch 403 against R2.
            .serviceConfiguration(S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .chunkedEncodingEnabled(false)
                .build())
            .build();
    }

    public void store(String key, byte[] bytes, String contentType) {
        try {
            client.putObject(
                PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
                RequestBody.fromBytes(bytes));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save file", e);
        }
    }

    public byte[] read(String key) {
        try {
            return client.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build()).readAllBytes();
        } catch (NoSuchKeyException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not read file", e);
        }
    }

    public void deleteQuietly(String key) {
        try {
            client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (Exception ignored) {
            // best-effort cleanup only
        }
    }
}
