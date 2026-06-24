package com.codequesthub.showcase;

import com.codequesthub.common.web.GlobalExceptionHandler;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@Import(GlobalExceptionHandler.class)
public class ShowcaseServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ShowcaseServiceApplication.class, args);
    }
}
