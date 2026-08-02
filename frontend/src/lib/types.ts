export type DocumentFields = Record<string, string>;

export type DocumentInfo = {
  name: string;
  filename: string;
  fields: string[];
  content: string;
};

export type SavedDocument = {
  id: number;
  filename: string;
  documentName: string;
  fields: DocumentFields;
  createdAt: string;
  updatedAt: string;
};

export function emptyFields(fieldLabels: string[]): DocumentFields {
  return Object.fromEntries(fieldLabels.map((label) => [label, ""]));
}
