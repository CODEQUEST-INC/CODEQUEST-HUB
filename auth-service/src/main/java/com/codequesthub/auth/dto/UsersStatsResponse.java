package com.codequesthub.auth.dto;

public class UsersStatsResponse {

    private final long totalUsers;
    private final long studentCount;
    private final long supervisorCount;
    private final long adminCount;
    private final long mentorCount;
    private final long totalGroups;
    private final long groupsWithoutSupervisor;
    private final long totalJudgeAssignments;

    public UsersStatsResponse(long totalUsers, long studentCount, long supervisorCount, long adminCount,
                               long mentorCount, long totalGroups, long groupsWithoutSupervisor,
                               long totalJudgeAssignments) {
        this.totalUsers = totalUsers;
        this.studentCount = studentCount;
        this.supervisorCount = supervisorCount;
        this.adminCount = adminCount;
        this.mentorCount = mentorCount;
        this.totalGroups = totalGroups;
        this.groupsWithoutSupervisor = groupsWithoutSupervisor;
        this.totalJudgeAssignments = totalJudgeAssignments;
    }

    public long getTotalUsers() { return totalUsers; }
    public long getStudentCount() { return studentCount; }
    public long getSupervisorCount() { return supervisorCount; }
    public long getAdminCount() { return adminCount; }
    public long getMentorCount() { return mentorCount; }
    public long getTotalGroups() { return totalGroups; }
    public long getGroupsWithoutSupervisor() { return groupsWithoutSupervisor; }
    public long getTotalJudgeAssignments() { return totalJudgeAssignments; }
}
