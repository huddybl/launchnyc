import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

const CHECKLIST_LABELS = [
  "Government-issued ID",
  "Signed offer letter",
  "Last 2 pay stubs",
  "Last 2 bank statements",
  "Most recent tax return",
  "Guarantor tax return + income proof",
  "Credit report",
  "Reference letter from previous landlord",
];

const CHECKLIST_KEYS = [
  "government_id",
  "offer_letter",
  "pay_stubs",
  "bank_statements",
  "tax_return",
  "guarantor_docs",
  "credit_report",
  "reference_letter",
];

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    backgroundColor: "#001f3f",
    color: "white",
    padding: 16,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  coverApplicant: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#001f3f",
    marginBottom: 8,
  },
  coverDate: {
    fontSize: 11,
    color: "#555",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#001f3f",
    marginBottom: 8,
    marginTop: 16,
  },
  sectionTitleFirst: {
    marginTop: 0,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 140,
    color: "#555",
  },
  value: {
    flex: 1,
  },
  block: {
    marginBottom: 12,
  },
  docRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "center",
  },
  docCheck: {
    width: 20,
    fontSize: 12,
  },
  docLabel: {
    flex: 1,
  },
  footerNote: {
    marginTop: 20,
    fontSize: 9,
    color: "#666",
    fontStyle: "italic",
  },
  apartmentBox: {
    borderWidth: 1,
    borderColor: "#dde2ea",
    padding: 12,
    marginBottom: 24,
    backgroundColor: "#f8f9fb",
  },
  apartmentTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#001f3f",
    marginBottom: 8,
  },
  docStatusTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#001f3f",
    marginBottom: 8,
    marginTop: 16,
  },
});

function orEmpty(v) {
  return v != null && String(v).trim() !== "" ? String(v).trim() : "—";
}

function formatPhone(p) {
  const v = orEmpty(p);
  if (v === "—") return v;
  const d = v.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return v;
}

export default function ApplicationPDF({ profile = {}, checklist = {}, apartment = null }) {
  const name = orEmpty(profile.full_name);
  const dateGenerated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      {/* PAGE 1 - Cover */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>LaunchNYC</Text>
        </View>
        <Text style={styles.coverApplicant}>{name || "Applicant"}</Text>
        <Text style={styles.coverDate}>Application package generated {dateGenerated}</Text>

        {apartment && (
          <View style={styles.apartmentBox}>
            <Text style={styles.apartmentTitle}>Listing</Text>
            <Text>
              {orEmpty(apartment.street || apartment.address)}
              {apartment.neighborhood ? `, ${apartment.neighborhood}` : ""}
            </Text>
            <View style={{ flexDirection: "row", marginTop: 4, gap: 16 }}>
              {apartment.price != null && apartment.price !== "" && (
                <Text>Rent: ${String(apartment.price).replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")}/mo</Text>
              )}
              {(apartment.beds != null || apartment.baths != null) && (
                <Text>
                  {apartment.beds ?? "?"} bed · {apartment.baths ?? "?"} bath
                </Text>
              )}
            </View>
          </View>
        )}

        <Text style={styles.docStatusTitle}>Document status</Text>
        {CHECKLIST_KEYS.map((key, i) => (
          <View key={key} style={styles.docRow}>
            <Text style={styles.docCheck}>{checklist[key] ? "✓" : "○"}</Text>
            <Text style={[styles.docLabel, checklist[key] ? {} : { color: "#888" }]}>
              {CHECKLIST_LABELS[i]} {checklist[key] ? "Ready" : "Not uploaded"}
            </Text>
          </View>
        ))}
      </Page>

      {/* PAGE 2 - Personal & Employment */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>LaunchNYC — Personal & Employment</Text>
        </View>

        <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Personal info</Text>
        <View style={styles.block}>
          <View style={styles.row}><Text style={styles.label}>Full name</Text><Text style={styles.value}>{orEmpty(profile.full_name)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Date of birth</Text><Text style={styles.value}>{orEmpty(profile.date_of_birth)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Email</Text><Text style={styles.value}>{orEmpty(profile.email)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Phone</Text><Text style={styles.value}>{formatPhone(profile.phone)}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Current address</Text>
        <View style={styles.block}>
          <View style={styles.row}><Text style={styles.label}>Street</Text><Text style={styles.value}>{orEmpty(profile.current_address)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Apt / Suite</Text><Text style={styles.value}>{orEmpty(profile.apt_suite)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>City</Text><Text style={styles.value}>{orEmpty(profile.city)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>State</Text><Text style={styles.value}>{orEmpty(profile.state)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Zip</Text><Text style={styles.value}>{orEmpty(profile.zip_code)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Current landlord name</Text><Text style={styles.value}>{orEmpty(profile.current_landlord_name)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Monthly rent</Text><Text style={styles.value}>{orEmpty(profile.current_monthly_rent)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>How long at address</Text><Text style={styles.value}>{orEmpty(profile.years_at_address)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Reason for leaving</Text><Text style={styles.value}>{orEmpty(profile.reason_for_leaving)}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Previous address</Text>
        <View style={styles.block}>
          <View style={styles.row}><Text style={styles.label}>Address</Text><Text style={styles.value}>{orEmpty(profile.previous_address)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>City</Text><Text style={styles.value}>{orEmpty(profile.previous_city)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>State</Text><Text style={styles.value}>{orEmpty(profile.previous_state)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Zip</Text><Text style={styles.value}>{orEmpty(profile.previous_zip)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Previous landlord name</Text><Text style={styles.value}>{orEmpty(profile.previous_landlord_name)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Previous landlord phone</Text><Text style={styles.value}>{formatPhone(profile.previous_landlord_phone)}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Employment</Text>
        <View style={styles.block}>
          <View style={styles.row}><Text style={styles.label}>Employer name</Text><Text style={styles.value}>{orEmpty(profile.employer_name)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Employer address</Text><Text style={styles.value}>{orEmpty(profile.employer_address)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Job title</Text><Text style={styles.value}>{orEmpty(profile.job_title)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Annual salary</Text><Text style={styles.value}>{profile.annual_salary ? `$${String(profile.annual_salary).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` : "—"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Start date</Text><Text style={styles.value}>{orEmpty(profile.start_date)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Supervisor name</Text><Text style={styles.value}>{orEmpty(profile.supervisor_name)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Employer phone</Text><Text style={styles.value}>{formatPhone(profile.employer_phone)}</Text></View>
        </View>
      </Page>

      {/* PAGE 3 - Guarantor, References & Documents */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>LaunchNYC — Guarantor, References & Documents</Text>
        </View>

        <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Guarantor</Text>
        <View style={styles.block}>
          <View style={styles.row}><Text style={styles.label}>Name</Text><Text style={styles.value}>{orEmpty(profile.guarantor_name)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Relationship</Text><Text style={styles.value}>{orEmpty(profile.guarantor_relationship)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Email</Text><Text style={styles.value}>{orEmpty(profile.guarantor_email)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Phone</Text><Text style={styles.value}>{formatPhone(profile.guarantor_phone)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Annual income</Text><Text style={styles.value}>{profile.guarantor_income ? `$${String(profile.guarantor_income).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` : "—"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Address</Text><Text style={styles.value}>{orEmpty(profile.guarantor_address)}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>References</Text>
        <View style={styles.block}>
          <View style={styles.row}><Text style={styles.label}>Personal reference</Text><Text style={styles.value}>{orEmpty(profile.reference_name)} — {formatPhone(profile.reference_phone)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Emergency contact</Text><Text style={styles.value}>{orEmpty(profile.emergency_name)} — {formatPhone(profile.emergency_phone)}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Document checklist</Text>
        {CHECKLIST_KEYS.map((key, i) => (
          <View key={key} style={styles.docRow}>
            <Text style={styles.docCheck}>{checklist[key] ? "✓" : "○"}</Text>
            <Text style={styles.docLabel}>{CHECKLIST_LABELS[i]} — {checklist[key] ? "Ready" : "Not uploaded"}</Text>
          </View>
        ))}

        <Text style={styles.footerNote}>
          Supporting documents marked Ready are attached separately.
        </Text>
      </Page>
    </Document>
  );
}
