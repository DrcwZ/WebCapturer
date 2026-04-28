export {};

type SaveResult = { ok: boolean; filePath?: string; message?: string };

declare global {
  interface Window {
    electronAPI: {
      saveRecording: (cameraLabel: string, arrayBuffer: ArrayBuffer) => Promise<SaveResult>;
    };
  }
}

interface CameraSession {
  deviceId: string;
  label: string;
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  videoElement: HTMLVideoElement;
  statusElement: HTMLDivElement;
}

const cameraCountSelect = document.getElementById('cameraCount') as HTMLSelectElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
const cameraGrid = document.getElementById('cameraGrid') as HTMLDivElement;

let sessions: CameraSession[] = [];

function updateStatus(element: HTMLDivElement, text: string) {
  element.textContent = text;
}

async function getVideoDevices(): Promise<MediaDeviceInfo[]> {
  await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'videoinput');
}

function makeCameraCard(label: string) {
  const card = document.createElement('div');
  card.className = 'camera-card';

  const title = document.createElement('h3');
  title.textContent = label;

  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;

  const status = document.createElement('div');
  status.className = 'status';
  status.textContent = '等待启动...';

  card.append(title, video, status);
  cameraGrid.appendChild(card);

  return { video, status };
}

async function startCapture() {
  startBtn.disabled = true;
  cameraGrid.innerHTML = '';
  sessions = [];

  try {
    const devices = await getVideoDevices();
    const needed = Number(cameraCountSelect.value);

    if (devices.length === 0) {
      throw new Error('未检测到可用摄像头');
    }

    if (devices.length < needed) {
      throw new Error(`只检测到 ${devices.length} 个摄像头，无法同时开启 ${needed} 个`);
    }

    for (const device of devices.slice(0, needed)) {
      const { video, status } = makeCameraCard(device.label || `Camera ${sessions.length + 1}`);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: device.deviceId } },
        audio: false
      });

      video.srcObject = stream;

      const chunks: Blob[] = [];
      const preferredMimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      const selectedMimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.start(1000);
      updateStatus(status, '录制中...');

      sessions.push({
        deviceId: device.deviceId,
        label: device.label || `Camera ${sessions.length + 1}`,
        stream,
        recorder,
        chunks,
        videoElement: video,
        statusElement: status
      });
    }

    stopBtn.disabled = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : '启动失败';
    alert(message);
    startBtn.disabled = false;
  }
}

async function stopAndSave() {
  stopBtn.disabled = true;

  const tasks = sessions.map(
    (session) =>
      new Promise<void>((resolve) => {
        session.recorder.onstop = async () => {
          try {
            const blob = new Blob(session.chunks, { type: 'video/webm' });
            const buffer = await blob.arrayBuffer();
            const result = await window.electronAPI.saveRecording(session.label, buffer);

            if (result.ok) {
              updateStatus(session.statusElement, `已保存：${result.filePath}`);
            } else {
              updateStatus(session.statusElement, `保存取消：${result.message ?? '未知原因'}`);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : '保存失败';
            updateStatus(session.statusElement, `保存失败：${message}`);
          }

          session.stream.getTracks().forEach((track) => track.stop());
          session.videoElement.srcObject = null;
          resolve();
        };

        if (session.recorder.state !== 'inactive') {
          session.recorder.stop();
        } else {
          resolve();
        }
      })
  );

  await Promise.all(tasks);
  startBtn.disabled = false;
}

startBtn.addEventListener('click', () => {
  void startCapture();
});

stopBtn.addEventListener('click', () => {
  void stopAndSave();
});
