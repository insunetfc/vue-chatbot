export function createChatFileState() {
  return {
    uploadedFiles: [],
    previewURLs: [],
    isDragOver: false,
    isDraggingFile: false,
    dragCounter: 0,
  };
}

export const chatFileMethods = {
  fileEmoji(name) {
    if (name.endsWith(".pdf")) return "📕";
    if (name.endsWith(".docx")) return "📘";
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "📗";
    if (name.match(/\.(pptx?|ppsx?)$/i)) return "📙";
    return "📄";
  },
  normalizeFiles(input) {
    let files = [];
    let mode = "append";
    let __fromChild = false;

    if (input && input.files) {
      files = input.files;
      mode = input.mode || "append";
      __fromChild = !!input.__fromChild;
    } else if (input && input.target && input.target.files) {
      files = input.target.files;
    } else if (input instanceof FileList) {
      files = input;
    } else if (Array.isArray(input)) {
      files = input;
    } else if (input instanceof File) {
      files = [input];
    } else {
      files = [];
    }

    return { files: Array.from(files), mode, __fromChild };
  },
  handleSelectFiles(payload) {
    const { files: raw, mode, __fromChild } = this.normalizeFiles(payload);
    if (!raw.length) return;

    if (__fromChild) {
      const baseList = mode === "replace" ? [] : this.uploadedFiles.slice();
      this.uploadedFiles = baseList.concat(raw);

      for (const f of raw) {
        if (f.type?.startsWith?.("image/")) {
          this.previewURLs.push(URL.createObjectURL(f));
        } else {
          this.previewURLs.push("");
        }
      }
      this.$nextTick(this.scrollToBottom);
      return;
    }

    const validExtensions =
      /\.(pdf|txt|docx|png|jpg|jpeg|xls|xlsx|ppt|pptx)$/i;

    const baseList = mode === "replace" ? [] : this.uploadedFiles.slice();
    const baseSeen = new Set(
      baseList.map((f) => `${f.name}:${f.size}:${f.lastModified || 0}`)
    );
    const currentTotal = baseList.reduce((s, f) => s + f.size, 0);

    let added = [];
    let addSize = 0;
    const toMB = (bytes) => Math.round(bytes / (1024 * 1024));

    for (const f of raw) {
      if (!validExtensions.test(f.name)) {
        this.showError(`❌ 지원 안함: ${f.name}`);
        continue;
      }
      if (f.size > this.LIMIT_PER_FILE) {
        this.showError(`❌ ${toMB(this.LIMIT_PER_FILE)}MB 초과: ${f.name}`);
        continue;
      }

      if (baseList.length + added.length >= this.LIMIT_MAX_FILES) {
        this.showError(`❌ 최대 ${this.LIMIT_MAX_FILES}개 파일`);
        break;
      }
      if (currentTotal + addSize + f.size > this.LIMIT_TOTAL) {
        this.showError(`❌ 총 ${toMB(this.LIMIT_TOTAL)}MB 초과`);
        break;
      }

      const key = `${f.name}:${f.size}:${f.lastModified || 0}`;
      if (baseSeen.has(key)) continue;

      added.push(f);
      addSize += f.size;
      baseSeen.add(key);
    }

    if (!added.length) return;

    this.uploadedFiles = baseList.concat(added);

    for (const f of added) {
      if (f.type?.startsWith?.("image/")) {
        const url = URL.createObjectURL(f);
        this.previewURLs.push(url);
      } else {
        this.previewURLs.push("");
      }
    }

    this.$nextTick(this.scrollToBottom);
  },
  handleFileUpload(e) {
    this.handleSelectFiles(e);
    if (e && e.target) e.target.value = "";
  },
  onComposerFiles(payload) {
    if (payload && Array.isArray(payload.files)) {
      this.handleSelectFiles(payload.files);
    }
  },
  removeFile(index) {
    const url = this.previewURLs[index];
    if (url) URL.revokeObjectURL(url);
    this.previewURLs.splice(index, 1);
    this.uploadedFiles.splice(index, 1);
    this.$nextTick(this.scrollToBottom);
  },
  clearAllPreviews() {
    this.previewURLs.forEach((u) => u && URL.revokeObjectURL(u));
    this.previewURLs = [];
    this.uploadedFiles = [];
    this.$nextTick(this.scrollToBottom);
  },
  async buildAttachmentPayloadForMessage() {
    const result = [];
    for (let i = 0; i < this.uploadedFiles.length; i++) {
      const f = this.uploadedFiles[i];
      if (f.type.startsWith("image/")) {
        const dataUrl = await this.readFileAsDataURL(f);
        result.push({ kind: "image", src: dataUrl, name: f.name });
      } else {
        result.push({
          kind: "file",
          emoji: this.fileEmoji(f.name),
          name: f.name,
        });
      }
    }
    return result;
  },
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = (err) => {
        console.warn("FileReader error:", err);
        reject(err);
      };
      fr.readAsDataURL(file);
    });
  },
  onDragEnter(e) {
    e.preventDefault();
    this.dragCounter++;
    this.isDraggingFile = true;
  },
  onDragLeave(e) {
    e.preventDefault();
    this.dragCounter--;
    if (this.dragCounter === 0) this.isDraggingFile = false;
  },
  onDragOver(e) {
    e.preventDefault();
    this.isDragOver = true;
  },
  onDrop(e) {
    e.preventDefault();
    this.dragCounter = 0;
    this.isDraggingFile = false;
    this.isDragOver = false;
    this.handleSelectFiles(e.dataTransfer?.files || []);
  },
};
