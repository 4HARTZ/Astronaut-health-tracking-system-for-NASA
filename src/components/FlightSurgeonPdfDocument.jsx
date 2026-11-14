import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { definitions, formatDate, observations } from '../health.js';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    lineHeight: 1.4,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#0284c7',
    paddingBottom: 10,
    marginBottom: 14,
  },
  classification: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0369a1',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 8.5,
    color: '#64748b',
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
    marginBottom: 14,
    gap: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 1,
  },
  disclaimer: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    padding: 6,
    fontSize: 7.5,
    color: '#1e40af',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 3,
    marginBottom: 8,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 4.5,
    paddingHorizontal: 6,
  },
  colMetric: { width: '35%', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  colCount: { width: '15%', fontSize: 8, textAlign: 'center' },
  colMissing: { width: '15%', fontSize: 8, textAlign: 'center' },
  colLatest: { width: '35%', fontSize: 8 },
  obsBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  obsItem: {
    fontSize: 8,
    marginBottom: 4,
  },
  recordBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 6,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  recordHeader: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0284c7',
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 2,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  vitalCell: {
    width: '31%',
    fontSize: 7.5,
    marginBottom: 2,
  },
  vitalName: {
    color: '#64748b',
  },
  vitalVal: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  notesBox: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: '#f1f5f9',
    fontSize: 7.5,
    color: '#334155',
  },
  signOffSection: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signBlock: {
    width: '45%',
  },
  signLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
    marginTop: 26,
    marginBottom: 4,
  },
  signLabel: {
    fontSize: 7.5,
    color: '#64748b',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#94a3b8',
  },
});

export default function FlightSurgeonPdfDocument({ report }) {
  if (!report || !report.records) return null;

  const changes = observations(report.records);

  return (
    <Document title={`NASA-Health-Briefing-${report.label || 'Crew'}`} author="NASA Space Medicine Operations">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.classification}>NASA SPACE MEDICINE OPERATIONS · BIO-TELEMETRY ARCHIVE</Text>
          <Text style={styles.title}>FLIGHT SURGEON MEDICAL BRIEFING</Text>
          <Text style={styles.subtitle}>
            Generated: {formatDate(report.generated)} · Timezone: {report.timezone} · Local Spacecraft Time
          </Text>
        </View>

        {/* Metadata Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Subject / Designation</Text>
            <Text style={styles.metaValue}>{report.label || 'Crew Member · In-Flight'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Date Window</Text>
            <Text style={styles.metaValue}>
              {report.filters.from || 'Earliest'} → {report.filters.to || 'Latest'}
            </Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Context Filter</Text>
            <Text style={styles.metaValue}>{report.filters.context || 'All Contexts'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Dataset Volume</Text>
            <Text style={styles.metaValue}>{report.records.length} Check-ins Logged</Text>
          </View>
        </View>

        {/* Clinical Disclaimer */}
        <View style={styles.disclaimer}>
          <Text>
            CONFIDENTIAL MEDICAL RECORD: Self-recorded telemetry and physiological checkpoints for mission flight
            surgeon review under NASA-STD-3001. Missing parameters indicate unrecorded checkpoints, not nominal baseline.
          </Text>
        </View>

        {/* Physiological Coverage Table */}
        <Text style={styles.sectionTitle}>1. Physiological Telemetry Coverage</Text>
        <View style={styles.table}>
          <View style={styles.tableRowHeader}>
            <Text style={styles.colMetric}>Parameter / Unit</Text>
            <Text style={styles.colCount}>Recorded</Text>
            <Text style={styles.colMissing}>Missing</Text>
            <Text style={styles.colLatest}>Latest Reading &amp; Context</Text>
          </View>
          {definitions.map(([name, title, unit]) => {
            const available = report.records.filter((e) => e[name] !== null);
            const latest = available[0];
            return (
              <View key={name} style={styles.tableRow}>
                <Text style={styles.colMetric}>{title} ({unit})</Text>
                <Text style={styles.colCount}>{available.length}</Text>
                <Text style={styles.colMissing}>{report.records.length - available.length}</Text>
                <Text style={styles.colLatest}>
                  {latest ? `${latest[name]} ${unit} (${formatDate(latest.time)} · ${latest.context})` : 'Not recorded'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Recorded Trend Observations */}
        <Text style={styles.sectionTitle}>2. Longitudinal Drift &amp; Metric Changes</Text>
        <View style={styles.obsBox}>
          {changes.length > 0 ? (
            changes.map(({ name, label, unit, latest, previous, delta }) => (
              <Text key={name} style={styles.obsItem}>
                • {label}: {previous[name]} → {latest[name]} {unit} ({delta === 0 ? 'unchanged' : `${delta > 0 ? '+' : ''}${delta}`})
                [{formatDate(previous.time)} to {formatDate(latest.time)} · {latest.context}]
              </Text>
            ))
          ) : (
            <Text style={styles.obsItem}>No consecutive comparable readings in matching context to compute delta.</Text>
          )}
        </View>

        {/* Recent Check-in Logs (top 4 for first page overview) */}
        <Text style={styles.sectionTitle}>3. Recent Chronological Check-ins</Text>
        {report.records.slice(0, 4).map((entry) => (
          <View key={entry.id} style={styles.recordBox}>
            <Text style={styles.recordHeader}>
              {formatDate(entry.time)} · {entry.context}
            </Text>
            <View style={styles.vitalsGrid}>
              {definitions.map(([name, title, unit]) => (
                <Text key={name} style={styles.vitalCell}>
                  <Text style={styles.vitalName}>{title}: </Text>
                  <Text style={styles.vitalVal}>
                    {entry[name] !== null ? `${entry[name]} ${unit}` : 'N/A'}
                  </Text>
                </Text>
              ))}
            </View>
            {report.includeNotes && entry.notes && (
              <View style={styles.notesBox}>
                <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>Symptoms/Notes: </Text>{entry.notes}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Flight Surgeon Assessment & Sign-off Block */}
        <View style={styles.signOffSection}>
          <View style={styles.signBlock}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8 }}>CREW MEDICAL OFFICER</Text>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Attending Crew Medical Officer / Flight Surgeon</Text>
          </View>
          <View style={styles.signBlock}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8 }}>MISSION CONTROL AUTHORIZATION</Text>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Date &amp; Space Medicine Flight Controller Stamp</Text>
          </View>
        </View>

        {/* Page Footer */}
        <View style={styles.footer}>
          <Text>ORBIT CREW HEALTH SYSTEM · TAURI 2 NATIVE DESKTOP</Text>
          <Text>CONFIDENTIAL CLINICAL TELEMETRY</Text>
        </View>
      </Page>
    </Document>
  );
}
