// Import courses saved by the original GitHub Pages app on this origin.
async function importPreviousCourses(destination) {
  const marker = 'degerlendirici-course-import-v1';
  if (localStorage.getItem(marker)) return;
  const oldName = 'degerlendirici-bagimsiz';
  const previous = await new Promise((resolve, reject) => {
    let missing = false;
    const open = indexedDB.open(oldName);
    open.onupgradeneeded = () => {
      missing = true;
      open.transaction.abort();
    };
    open.onerror = () => missing ? resolve(null) : reject(open.error);
    open.onsuccess = () => resolve(open.result);
  });

  if (previous) {
    let courses;
    try {
      courses = await new Promise((resolve, reject) => {
        const read = previous.transaction('courses').objectStore('courses').getAll();
        read.onsuccess = () => resolve(read.result);
        read.onerror = () => reject(read.error);
      });
    } finally {
      previous.close();
    }

    const records = courses.map(old => {
      const course = fresh(old.title, old.code);
      Object.assign(course, {
        id: old.id, teacher: old.teacher, term: [old.year, old.term].filter(Boolean).join(' '),
        report: old.report, cover: true, storageRevision: 1
      });
      for (const entry of old.files) course.files[entry.section].push(entry.file);
      if (old.scores) {
        const [header, ...scores] = old.scores.trim().split(/\r?\n/).map(line => line.split('\t').map(cell => cell.trim()));
        const questions = header.slice(2);
        course.sheets['Sınav'] = {
          questions, maps: questions.map(() => ''), maximums: questions.map(() => ''), include: true,
          rows: scores.map(([id, name, ...points]) => [
            id, name, ...points.map(p => p.toUpperCase() === 'G' ? 'G' : Number(p.replace(',', '.'))), '', ''
          ])
        };
      }
      return course;
    });

    await new Promise((resolve, reject) => {
      const tx = destination.transaction('courses', 'readwrite');
      const store = tx.objectStore('courses');
      for (const record of records) {
        const lookup = store.getKey(record.id);
        lookup.onsuccess = () => {
          if (lookup.result === undefined) store.add(record);
        };
      }
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
  }
  localStorage.setItem(marker, '1');
}
