import React from 'react';
import { Linking, ScrollView, StyleSheet } from 'react-native';
import Text from '../components/Text';
import Card from '../components/Card';
import { radius, spacing, typography, useTheme } from '../theme';

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <Card style={styles.card}>
      <Text style={styles.heading}>{heading}</Text>
      {children}
    </Card>
  );
}

export default function HelpScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Section heading="How it works">
        <Text style={styles.step}>1. Form a group with your teammates.</Text>
        <Text style={styles.step}>2. Submit a project proposal for your supervisor to review.</Text>
        <Text style={styles.step}>3. Once it's approved, build your project and track work on the task board.</Text>
        <Text style={styles.step}>4. Judges score your project against the cohort's judging criteria.</Text>
        <Text style={styles.step}>5. Publish your finished project to the public showcase.</Text>
      </Section>

      <Section heading="Registration fee">
        <Text style={styles.body}>
          Each student pays a one-time registration fee for their cohort. You can pay from the Group tab — go to{' '}
          <Text style={styles.bodyStrong}>Group → My registration fee → Pay now</Text>. Your supervisor and cohort
          admins can see who has and hasn't paid.
        </Text>
      </Section>

      <Section heading="Frequently asked questions">
        <Text style={styles.bodyStrong}>What's a cohort?</Text>
        <Text style={styles.body}>Your cohort is the intake you registered under — it's shared by everyone building projects at the same time.</Text>
        <Text style={[styles.bodyStrong, styles.faqSpacing]}>How are groups formed?</Text>
        <Text style={styles.body}>Cohort admins create groups manually, or auto-generate them by index number.</Text>
        <Text style={[styles.bodyStrong, styles.faqSpacing]}>How is judging scored?</Text>
        <Text style={styles.body}>
          Each judge scores your project against a set of weighted criteria. Once an admin publishes the cohort's
          results, your group's rank appears on the Leaderboard and on your showcase entry.
        </Text>
      </Section>

      <Section heading="Contact & support">
        <Text style={styles.body}>Something not working, or a question this page doesn't cover? Reach out:</Text>
        <Text style={styles.link} onPress={() => Linking.openURL('mailto:jeremybrobbey@gmail.com')}>
          jeremybrobbey@gmail.com
        </Text>
        <Text style={styles.link} onPress={() => Linking.openURL('tel:+233547540118')}>
          +233 54 754 0118
        </Text>
      </Section>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { padding: spacing.xxl, gap: spacing.md, backgroundColor: colors.bg },
    card: { borderRadius: radius.xxl, gap: spacing.xs },
    heading: { ...typography.subheading, fontSize: 16, marginBottom: spacing.xs },
    step: { ...typography.body, color: colors.textMuted, lineHeight: 21 },
    body: { ...typography.body, color: colors.textMuted, lineHeight: 21 },
    bodyStrong: { ...typography.body, fontWeight: '700' },
    faqSpacing: { marginTop: spacing.sm },
    link: { ...typography.body, color: colors.primary, fontWeight: '600', marginTop: 2 },
  });
}
