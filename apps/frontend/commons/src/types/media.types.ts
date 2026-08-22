// Biblioteca de medios — un archivo se sube una vez y puede reutilizarse en
// varias publicaciones (ver modelo.txt: Media/PostMedia). Sin representación
// en el frontend hasta el 2026-07-19 — ver docs/frontend-db-alignment-implementation.md §7.
export interface Media {
  id: string;
  brandId: string;
  uploadedBy: string; // FK -> users.id (CM o Diseñador)
  fileName: string;
  originalName: string;
  mimeType: string;
  url: string;
  size: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null; // solo video
}

// Join Post<->Media con orden explícito — un post puede tener varios adjuntos.
export interface PostMedia {
  postId: string;
  mediaId: string;
  order: number;
}
