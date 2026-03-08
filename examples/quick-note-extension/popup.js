document.addEventListener('DOMContentLoaded', () => {
  const notesList = document.getElementById('notes-list');
  const emptyState = document.getElementById('empty-state');
  const addNoteBtn = document.getElementById('add-note-btn');
  
  // Load notes from storage when popup opens
  loadNotes();
  
  // Add new note button click handler
  addNoteBtn.addEventListener('click', () => {
    createNote('');
  });
  
  function loadNotes() {
    chrome.storage.local.get(['notes'], (result) => {
      const notes = result.notes || [];
      renderNotes(notes);
    });
  }
  
  function renderNotes(notes) {
    notesList.innerHTML = '';
    
    if (notes.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    
    emptyState.style.display = 'none';
    
    // Render notes in reverse order (newest first)
    notes.slice().reverse().forEach((note, index) => {
      const noteCard = createNoteElement(note, notes.length - 1 - index);
      notesList.appendChild(noteCard);
    });
    
    // Auto-focus the first textarea if there are notes
    const firstTextarea = notesList.querySelector('.note-textarea');
    if (firstTextarea) {
      firstTextarea.focus();
    }
  }
  
  function createNoteElement(note, index) {
    const noteCard = document.createElement('div');
    noteCard.className = 'note-card';
    noteCard.dataset.index = index;
    
    const textarea = document.createElement('textarea');
    textarea.className = 'note-textarea';
    textarea.placeholder = 'Write your note here...';
    textarea.value = note.text;
    textarea.addEventListener('input', (e) => {
      saveNote(index, e.target.value);
    });
    
    const noteFooter = document.createElement('div');
    noteFooter.className = 'note-footer';
    
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = formatTimestamp(note.timestamp);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      deleteNote(index);
    });
    
    noteFooter.appendChild(timestamp);
    noteFooter.appendChild(deleteBtn);
    
    noteCard.appendChild(textarea);
    noteCard.appendChild(noteFooter);
    
    return noteCard;
  }
  
  function createNote(text) {
    chrome.storage.local.get(['notes'], (result) => {
      const notes = result.notes || [];
      const newNote = {
        text: text,
        timestamp: Date.now()
      };
      notes.push(newNote);
      
      chrome.storage.local.set({ notes }, () => {
        loadNotes();
      });
    });
  }
  
  function saveNote(index, text) {
    chrome.storage.local.get(['notes'], (result) => {
      const notes = result.notes || [];
      // Reverse the index because we display notes in reverse order
      const actualIndex = notes.length - 1 - index;
      
      if (notes[actualIndex]) {
        notes[actualIndex].text = text;
        notes[actualIndex].timestamp = Date.now();
        
        chrome.storage.local.set({ notes });
      }
    });
  }
  
  function deleteNote(index) {
    chrome.storage.local.get(['notes'], (result) => {
      const notes = result.notes || [];
      const actualIndex = notes.length - 1 - index;
      
      notes.splice(actualIndex, 1);
      
      chrome.storage.local.set({ notes }, () => {
        loadNotes();
      });
    });
  }
  
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Otherwise show date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
  
  // Add keyboard shortcut for creating new note (Ctrl+Enter)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      createNote('');
    }
  });
});
