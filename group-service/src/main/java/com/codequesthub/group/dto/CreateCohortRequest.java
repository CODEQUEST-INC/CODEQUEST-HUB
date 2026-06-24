package com.codequesthub.group.dto;

import jakarta.validation.constraints.*;

public class CreateCohortRequest {
    @NotBlank @Size(max = 100)
    private String name;

    @NotNull @Min(2000) @Max(2200)
    private Integer year;

    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public Integer getYear() { return year; }
    public void setYear(Integer v) { this.year = v; }
}
