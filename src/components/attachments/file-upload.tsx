"use client";

import { useState } from "react";
import { Upload, X, FileText, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Attachment {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  createdAt: string;
}

interface FileUploadProps {
  ticketId: string;
  ticketType: "regular" | "support";
  attachments?: Attachment[];
  onUploadComplete?: () => void;
  onDeleteComplete?: () => void;
  disabled?: boolean;
}

export function FileUpload({
  ticketId,
  ticketType,
  attachments = [],
  onUploadComplete,
  onDeleteComplete,
  disabled = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверка размера (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Файл слишком большой. Максимум 10MB");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ticketId", ticketId);
      formData.append("ticketType", ticketType);

      const response = await fetch("/api/attachments/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload file");
      }

      toast.success("Файл успешно загружен");
      onUploadComplete?.();
      
      // Очищаем input
      event.target.value = "";
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(error.message || "Ошибка загрузки файла");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      const response = await fetch(`/api/attachments/${attachmentId}`);
      
      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Ошибка скачивания файла");
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm("Удалить файл?")) return;

    setDeletingId(attachmentId);

    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      toast.success("Файл удален");
      onDeleteComplete?.();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Ошибка удаления файла");
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      {/* Кнопка загрузки */}
      <div>
        <label htmlFor={`file-upload-${ticketId}`}>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading}
            asChild
          >
            <span className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Загрузка..." : "Прикрепить файл"}
            </span>
          </Button>
        </label>
        <input
          id={`file-upload-${ticketId}`}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.jpg,.jpeg,.png,.gif,.webp"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Максимум 10MB. Разрешены: PDF, DOC, XLS, TXT, изображения, ZIP
        </p>
      </div>

      {/* Список прикрепленных файлов */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Прикрепленные файлы:</h4>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)} •{" "}
                      {new Date(attachment.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment.id, attachment.filename)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(attachment.id)}
                    disabled={deletingId === attachment.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

