import { useState } from "react";
import { DocViewItem } from "@/components/documents/DocViewItem";
import { DriverDocUpload } from "@/components/documents/DriverDocUpload";
import { Tabs } from "@/components/ui/Tabs";
import { useAppStore } from "@/store/useAppStore";

const tabs = [
  { value: "view", label: "View Document" },
  { value: "update", label: "Update Document" },
];

export function DriverDocumentsPage() {
  const [tab, setTab] = useState("view");
  const { driverDocuments, uploadDriverDocument } = useAppStore();

  return (
    <div className="page-shell stack">
      <div>
        <h1 className="page-title">Documents</h1>
        <p className="page-meta">Driver, vehicle, and LR copy visibility with mock upload updates.</p>
      </div>
      <Tabs value={tab} options={tabs} onChange={setTab} />
      {tab === "view" ? (
        <div className="stack">
          <DocViewItem label="Driver documents" url={driverDocuments.drivingLicense.url} />
          <DocViewItem label="Vehicle documents" url={driverDocuments.rcFcDocument.url} />
          <DocViewItem label="LR copies" url="/mock/lr-bundle.pdf" />
        </div>
      ) : (
        <div className="stack">
          <DriverDocUpload
            doc={driverDocuments.drivingLicense}
            onUpload={() => uploadDriverDocument("drivingLicense", `/mock/driving-license-${Date.now()}.pdf`)}
          />
          <DriverDocUpload
            doc={driverDocuments.aadhar}
            onUpload={() => uploadDriverDocument("aadhar", `/mock/aadhar-${Date.now()}.pdf`)}
          />
          <DriverDocUpload
            doc={driverDocuments.rcFcDocument}
            onUpload={() => uploadDriverDocument("rcFcDocument", `/mock/rc-${Date.now()}.pdf`)}
          />
        </div>
      )}
    </div>
  );
}
