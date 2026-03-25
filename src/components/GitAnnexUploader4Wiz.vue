<template>

    <v-row
        v-if="showTargetSelector || showRepoSelector"
        no-gutters
        align="stretch"
        class="ma-0 pa-0"
        >
        <v-col cols="6" v-if="showTargetSelector">
            <v-select
                v-model="selectedTarget"
                label="Target"
                :items="targetItems"
                density="compact"
                variant="outlined"
            />
        </v-col>
        <v-col cols="6" v-if="showRepoSelector">
            <v-select
                v-model="selectedRepo"
                label="Repository"
                :items="repoItems"
                density="compact"
                variant="outlined"
            />
        </v-col>
    </v-row>
    <v-row no-gutters align="stretch" class="ma-0 pa-0">
        <v-col class="d-flex align-stretch justify-center" style="padding: 0; padding-left: 2px;">
            <v-card
                class="drag-drop-area"
                :class="{ dragover: isDragging }"
                @click="onCardClickGuarded"
                @dragover.prevent="onDragOver"
                @dragleave.prevent="onDragLeave"
                @drop.prevent="onFileDrop"
                variant="outlined"
                :disabled="props.disabled"
                ref="mainCard"
            >
                <!-- Hidden file input -->
                <input
                    type="file"
                    ref="fileInput"
                    class="hidden"
                    @change="onFileSelect"
                />
                <!-- Centered icon -->
                <span v-if="isUploading">
                    <v-progress-circular indeterminate></v-progress-circular>
                </span>
                <span v-else>
                    <span v-if="uploadSuccess">
                        <v-icon size="28" color="success">mdi-check</v-icon>
                    </span>
                    <span v-else-if="uploadFailure">
                        <v-icon size="28" color="error">mdi-alert-circle-outline</v-icon>
                    </span>
                    <span v-else>
                        <v-icon size="28" color="#616161">mdi-paperclip</v-icon>
                    </span>
                </span>
                <v-tooltip
                    :activator="'parent'"
                    v-model="errorDialog"
                    location="top"
                    :open-on-click="false"
                    :open-on-hover="false"
                    :interactive="true"
                >
                    <v-row no-gutters>
                        <v-col cols="11">{{ uploadFailureError.error }}</v-col>
                        <v-col>
                            <v-btn
                                variant="text"
                                density="compact"
                                size="small"
                                icon="mdi-close-circle-outline"
                                @click="errorDialog = false"
                            >
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-tooltip>
            </v-card>
        </v-col>
    </v-row>
    <v-row v-if="showUploadedFile" no-gutters class="ma-0 pa-1">
        <small>
            <em>
                <v-icon>mdi-file-check-outline</v-icon>&nbsp;
                {{ uploadedFileData.name }} ({{ formatBytes(uploadedFileData.size) }})
                <a :href="uploadedFileData.downloadUrl"><v-icon>mdi-download</v-icon></a>
            </em>
        </small>
    </v-row>
    <v-alert
        v-model="tokenAlert"
        density="compact"
        text="Please enter and save a token (via the settings menu) before uploading a file"
        title="No token found"
        type="warning"
        closable
    />
</template>

<script setup>
import { ref, inject, toRaw, onMounted, watch} from 'vue'

const props = defineProps({
    modelValue: Object,
    config: Object,
    disabled: Boolean,
});
import { useToken } from '@/composables/tokens';
const { token, setToken, clearToken } = useToken();
const mainCard = ref(null);
const tokenExists = ref(false)
const emit = defineEmits(['uploadComplete', 'update:modelValue'])
const isDragging = ref(false)
const fileData = ref({})
const fileInput = ref(null)
const tokenWarning = inject('tokenWarning');

const clientUuid = props.config.client_uuid
const targets = props.config.targets || []
const selectedTarget = ref(null)
const selectedRepo = ref(null)
const targetItems = ref([])
const repoItems = ref([])
const showTargetSelector = ref(false)
const showRepoSelector = ref(false)

const isUploading = ref(false)
const uploadSuccess = ref(false)
const uploadFailure = ref(false)
const uploadFailureError = ref({})
const errorDialog = ref(false)
const showUploadedFile = ref(false)
const uploadedFileData = ref(null)

const tokenAlert = ref(false)

watch(selectedTarget, () => {
    updateRepositories()
})

onMounted(() => {
    if (token.value !== null && token.value !== 'null') {
        tokenExists.value = true;
    }
    // Build target selector
    if (targets.length > 1) {
        showTargetSelector.value = true
        targetItems.value = targets.map(t => ({
            title: t.name,
            value: t
        }))
    }
    // Select default target
    selectedTarget.value = targets[0] || null
    updateRepositories()
})

const updateRepositories = () => {
    if (!selectedTarget.value) return
    const repos = selectedTarget.value.repositories || []
    if (repos.length > 1) {
        showRepoSelector.value = true
        repoItems.value = repos.map(r => ({
            title: r.name,
            value: r
        }))
    } else {
        showRepoSelector.value = false
    }
    selectedRepo.value = repos[0] || null
}

// Format file sizes
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Handle file selection from the file input
const onFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
        console.log(file)
        validateAndReadFile(file)
    }
}

// Handle dragging over the drop area
const onDragOver = () => {
    isDragging.value = true
}

// Handle drag leave (when the file is dragged out of the area)
const onDragLeave = () => {
    isDragging.value = false
}

// Handle file drop event
const onFileDrop = (event) => {
    isDragging.value = false
    const file = event.dataTransfer.files[0]
    if (file) {
        validateAndReadFile(file)
    }
}

const onCardClickGuarded = (event) => {
    if (props.disabled) {
        event.preventDefault()
        event.stopImmediatePropagation()
        return
    }
    onCardClick()
}

const onCardClick = () => {
    if (beforeUploadCheck() === false) {
        // Do NOT open file dialog
        return;
    }
    fileInput.value.click()
}

function beforeUploadCheck() {
    tokenAlert.value = false;
    if (token.value !== null && token.value !== 'null') {
        tokenExists.value = true;
    }
    if (!tokenExists.value) {
        // showTokenDialog.value = true;
        tokenWarning.value = true;
        tokenAlert.value = true;
        return false;
    }
    return true;
}

// Validate file type and read it
const validateAndReadFile = async (file) => {
    let result = { status: null, error: null }
    try {
        const arrayBuffer = await file.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
        // Convert hash buffer to hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        // get file extension
        const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : null
        // construct git annex key
        const gitAnnexKey = `SHA256E-s${file.size}--${hashHex}${extension !== null ? '.'+extension : ''}`
        fileData.value = {
            file: file,
            name: file.name,
            size: file.size,
            type: file.type || 'Unknown',
            ext: extension,
            hash: hashHex,
            url: URL.createObjectURL(file),
            annexKey: gitAnnexKey,
            downloadUrl: `${selectedTarget.value.base_url}/${selectedRepo.value.annex_uuid}/key/${encodeURIComponent(gitAnnexKey)}`
        }
        isUploading.value = true
        result = await uploadFile()
        isUploading.value = false
        if (result.status == 'ok') {
            emit('update:modelValue', toRaw(fileData.value))
            uploadedFileData.value = toRaw(fileData.value)
            showUploadedFile.value = true;
            uploadSuccess.value = true;
            uploadFailure.value = false;
            setTimeout(() => {
                uploadSuccess.value = false;
            }, 1000);
        } else {
            uploadSuccess.value = false;
            uploadFailure.value = true;
            setTimeout(() => {
                uploadFailure.value = false;
            }, 1000);
            uploadFailureError.value = result;
            errorDialog.value = true;
        }
    } catch (error) {
        alert('Failed to process file: ' + error.message)
        result.status = 'error';
        result.error = error;
        uploadSuccess.value = false;
        uploadFailure.value = true;
        uploadFailureError.value = error;
        setTimeout(() => {
            uploadFailure.value = false;
        }, 1500);
        errorDialog.value = true;
    }
    // Emit upload result to parent
    emit('uploadComplete', {
        status: result.status,
        error: result.error || null,
        fileData: toRaw(fileData.value),
    })
}

const uploadFile = async () => {

    // During development, change baseUrl in config to '/forgejo-api' to circumvent CORS issues;
    // it sends the request to the local proxy server instead of directly to the baseUrl
    const endpoint = `${selectedTarget.value.base_url}/${selectedRepo.value.annex_uuid}/v4/put?key=${encodeURIComponent(fileData.value.annexKey)}&clientuuid=${encodeURIComponent(clientUuid)}`
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'X-git-annex-data-length': fileData.value.size,
                'Authorization': 'Basic ' + btoa(`${token.value}:`)
            },
            body: fileData.value.file
        })
        if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}: ${response.statusText}`)
        }
        const result = await response.text()
        console.log('Upload successful:', result)
        return {
            status: 'ok'
        }
    } catch (error) {
        console.error('Upload error:', error)
        return {
            status: 'error',
            'error': error,
        }
    }
}
</script>

<style scoped>
.drag-drop-area {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    min-height: 40px;
    width: 100%;
    cursor: pointer;
    border-color: #b4b4b4;
    transition: all 0.3s ease;
}

.drag-drop-area.dragover {
    border: dashed #3f51b5;
    background-color: #f0f0f0;
    filter: grayscale(50%);
}

.drag-drop-area:hover {
    border-color: black;
}

.hidden {
    display: none;
}

.v-card--disabled {
    pointer-events: auto;
}

.v-card--disabled * {
  pointer-events: none;
}
</style>
