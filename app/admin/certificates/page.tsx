import AdminModulePlaceholder from "@/components/admin/AdminModulePlaceholder";

export default function AdminCertificatesPage() {
  return (
    <AdminModulePlaceholder
      title="Certificates & Accreditations"
      category="Awards & Badges"
      description="Generate and verify official participation certificates, podium diplomas, and QR credentials."
      futureFeatures={[
        "Automated digital certificate generation for medalists and participants",
        "Cryptographically signed verification QR codes for printed diplomas",
        "Bulk PDF export by house, division, or event",
        "Public credential verification portal integration",
      ]}
    />
  );
}

