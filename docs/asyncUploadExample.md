# Asynchronous Upload Frontend Example

## Overview
The new asynchronous upload flow allows the frontend to get an immediate response while files upload in the background. This significantly improves user experience for large file uploads.

## Frontend Implementation

### 1. Create Sound (Immediate Response)

```javascript
// Create sound with files - returns immediately
const createSound = async (formData) => {
  try {
    const response = await fetch('/api/sounds/add-sounds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();
    
    if (response.status === 201) {
      console.log('Sound created:', result.soundId);
      console.log('Upload status:', result.uploadStatus);
      
      // Start polling for upload completion
      pollUploadStatus(result.soundId);
      
      return result;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error creating sound:', error);
    throw error;
  }
};
```

### 2. Poll Upload Status

```javascript
// Poll upload status until completion
const pollUploadStatus = async (soundId) => {
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  let attempts = 0;
  
  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/sounds/upload-status/${soundId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const status = await response.json();
      
      switch (status.uploadStatus) {
        case 'completed':
          console.log('Upload completed!');
          console.log('Sound file:', status.soundFile);
          console.log('Thumbnail:', status.thumbnail);
          
          // Update UI - files are ready
          updateUIForCompletedUpload(status);
          return;
          
        case 'failed':
          console.error('Upload failed:', status.uploadError);
          
          // Update UI - show error
          showUploadError(status.uploadError);
          return;
          
        case 'uploading':
          attempts++;
          if (attempts >= maxAttempts) {
            console.error('Upload timeout');
            showUploadError('Upload timeout - please try again');
            return;
          }
          
          // Continue polling
          setTimeout(checkStatus, 5000); // Check every 5 seconds
          break;
      }
    } catch (error) {
      console.error('Error checking upload status:', error);
      setTimeout(checkStatus, 5000);
    }
  };
  
  // Start polling
  checkStatus();
};
```

### 3. Complete Example with UI Updates

```javascript
// Complete example with progress tracking
const uploadSoundWithProgress = async (formData) => {
  // Show initial progress
  showProgressBar('Creating sound...', 0);
  
  try {
    // Step 1: Create sound (immediate)
    const result = await createSound(formData);
    
    // Step 2: Show upload progress
    showProgressBar('Uploading files...', 10);
    
    // Step 3: Poll for completion
    await pollUploadStatusWithProgress(result.soundId);
    
  } catch (error) {
    showError('Upload failed: ' + error.message);
  }
};

const pollUploadStatusWithProgress = async (soundId) => {
  const maxAttempts = 60;
  let attempts = 0;
  
  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/sounds/upload-status/${soundId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const status = await response.json();
      
      switch (status.uploadStatus) {
        case 'completed':
          showProgressBar('Upload completed!', 100);
          showSuccess('Sound uploaded successfully!');
          
          // Enable sound playback
          enableSoundPlayback(status.soundFile, status.thumbnail);
          break;
          
        case 'failed':
          showError('Upload failed: ' + status.uploadError);
          break;
          
        case 'uploading':
          attempts++;
          const progress = Math.min(10 + (attempts / maxAttempts) * 80, 90);
          showProgressBar('Uploading files...', progress);
          
          if (attempts >= maxAttempts) {
            showError('Upload timeout - please try again');
            return;
          }
          
          setTimeout(checkStatus, 5000);
          break;
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setTimeout(checkStatus, 5000);
    }
  };
  
  checkStatus();
};

// UI Helper Functions
const showProgressBar = (message, percentage) => {
  const progressBar = document.getElementById('uploadProgress');
  const progressText = document.getElementById('uploadProgressText');
  
  progressBar.style.width = percentage + '%';
  progressText.textContent = `${message} (${Math.round(percentage)}%)`;
};

const showSuccess = (message) => {
  const successDiv = document.getElementById('uploadSuccess');
  successDiv.textContent = message;
  successDiv.style.display = 'block';
};

const showError = (message) => {
  const errorDiv = document.getElementById('uploadError');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
};

const enableSoundPlayback = (soundFile, thumbnail) => {
  const audioPlayer = document.getElementById('audioPlayer');
  const thumbnailImg = document.getElementById('soundThumbnail');
  
  audioPlayer.src = soundFile;
  thumbnailImg.src = thumbnail;
  
  // Enable play button
  document.getElementById('playButton').disabled = false;
};
```

### 4. HTML Structure

```html
<div class="upload-container">
  <form id="soundForm">
    <input type="text" name="title" placeholder="Sound Title" required>
    <textarea name="description" placeholder="Description" required></textarea>
    <input type="file" name="soundFile" accept="audio/*" required>
    <input type="file" name="thumbnail" accept="image/*" required>
    <button type="submit">Upload Sound</button>
  </form>
  
  <!-- Progress Tracking -->
  <div id="uploadProgress" class="progress-bar">
    <div id="uploadProgressBar" class="progress-fill"></div>
  </div>
  <div id="uploadProgressText">Ready to upload</div>
  
  <!-- Status Messages -->
  <div id="uploadSuccess" class="success-message" style="display: none;"></div>
  <div id="uploadError" class="error-message" style="display: none;"></div>
  
  <!-- Audio Player (enabled after upload) -->
  <div id="audioPlayerContainer" style="display: none;">
    <img id="soundThumbnail" alt="Sound thumbnail">
    <audio id="audioPlayer" controls></audio>
    <button id="playButton" disabled>Play</button>
  </div>
</div>
```

## Benefits

1. **Immediate Response**: Frontend gets response in ~100ms instead of 5+ minutes
2. **Better UX**: Users see progress and can continue using the app
3. **Error Handling**: Clear feedback if upload fails
4. **Scalability**: Server can handle more concurrent uploads
5. **Progress Tracking**: Real-time upload status updates

## Performance Improvement

- **Before**: 5+ minutes blocking response
- **After**: ~100ms immediate response + background upload
- **User Experience**: Dramatically improved responsiveness
