package com.codequesthub.judging;

import com.codequesthub.common.web.GlobalExceptionHandler;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@Import(GlobalExceptionHandler.class)
public class JudgingServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(JudgingServiceApplication.class, args);
    }
}
