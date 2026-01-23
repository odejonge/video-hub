import { onUnmounted, watch, type Ref } from 'vue'
import Hls from 'hls.js'

export function useHls(videoRef: Ref<HTMLVideoElement | null>, videoUrl: Ref<string>) {
  let hlsInstance: Hls | null = null

  function setupVideo() {
    if (!videoRef.value) return
    
    const url = videoUrl.value
    if (!url) return
    
    // Clean up previous HLS instance
    if (hlsInstance) {
      hlsInstance.destroy()
      hlsInstance = null
    }
    
    // Check if it's an HLS stream
    if (url.endsWith('.m3u8')) {
      if (Hls.isSupported()) {
        hlsInstance = new Hls()
        hlsInstance.loadSource(url)
        hlsInstance.attachMedia(videoRef.value)
      } else if (videoRef.value.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari has native HLS support
        videoRef.value.src = url
      }
    } else {
      // Regular MP4
      videoRef.value.src = url
    }
  }

  function cleanup() {
    if (hlsInstance) {
      hlsInstance.destroy()
      hlsInstance = null
    }
  }

  // Watch for URL changes
  watch(videoUrl, () => {
    setupVideo()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    setupVideo,
    cleanup
  }
}
