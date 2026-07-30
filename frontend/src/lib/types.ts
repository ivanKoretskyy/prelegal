export type FieldKey =
  | "partyAName"
  | "partyAAddress"
  | "partyBName"
  | "partyBAddress"
  | "purpose"
  | "effectiveDate"
  | "mndaTerm"
  | "termOfConfidentiality"
  | "governingLaw"
  | "jurisdiction";

export type NdaFormData = Record<FieldKey, string>;

export const FIELD_LABELS: Record<FieldKey, string> = {
  partyAName: "Party A name",
  partyAAddress: "Party A address",
  partyBName: "Party B name",
  partyBAddress: "Party B address",
  purpose: "Purpose",
  effectiveDate: "Effective Date",
  mndaTerm: "MNDA Term",
  termOfConfidentiality: "Term of Confidentiality",
  governingLaw: "Governing Law",
  jurisdiction: "Jurisdiction",
};

export const EMPTY_FORM_DATA: NdaFormData = {
  partyAName: "",
  partyAAddress: "",
  partyBName: "",
  partyBAddress: "",
  purpose: "",
  effectiveDate: "",
  mndaTerm: "",
  termOfConfidentiality: "",
  governingLaw: "",
  jurisdiction: "",
};
