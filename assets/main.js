/* ═══════════════════════════════════════════════════
   APPLE-STYLE MOTION LAYER – assets/main.js
   Shared JS for:
   1. Nav slider memory between pages (sessionStorage)
   2. Cross-document View Transition fallback
   3. Filter chips & tab switches (View Transitions)
   4. Theme toggle with circular ripple animation
   5. Staggered scroll reveal with instant hover cleanup
   6. Search & Contact Modal smooth scale-fade closing
   LOCKED: Zero changes to visual design, colors, or layout.
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  const EASING = 'cubic-bezier(.32,.72,0,1)';
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function supportsViewTransitions() {
    return typeof document.startViewTransition === 'function';
  }

  /* ═══════════ 1. NAV SLIDER MEMORY ACROSS PAGES ═══════════ */
  function initNavSliderMemory() {
    const navWrapper = document.getElementById('main-nav-wrapper');
    if (!navWrapper) return;
    const slider = document.getElementById('nav-slider');
    if (!slider) return;

    const links = Array.from(navWrapper.querySelectorAll('li'));
    if (!links.length) return;

    // Determine current page's target nav element
    function getTargetNavLi() {
      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();
      if (path.includes('research')) {
        return links.find(li => { const a = li.querySelector('a'); return a && a.getAttribute('data-nav') === 'research'; });
      }
      if (path.includes('blog') || path.includes('writing')) {
        return links.find(li => { const a = li.querySelector('a'); return a && a.getAttribute('data-nav') === 'writing'; });
      }
      if (path.includes('about')) {
        return links.find(li => { const a = li.querySelector('a'); return a && a.getAttribute('data-nav') === 'about'; });
      }
      return links[0]; // Home
    }

    const activeLi = getTargetNavLi() || links[0];

    function getPosition(li) {
      if (!li) return null;
      const rect = li.getBoundingClientRect();
      const wrapRect = navWrapper.getBoundingClientRect();
      return {
        left: rect.left - wrapRect.left,
        width: rect.width
      };
    }

    // Check if we have a stored previous slider position from the previous page
    const prevPosData = sessionStorage.getItem('navPrevSlider');
    let prevPos = null;
    if (prevPosData) {
      try { prevPos = JSON.parse(prevPosData); } catch (e) { prevPos = null; }
    }

    function applyTargetPos(animate) {
      const curPos = getPosition(activeLi);
      if (!curPos || curPos.width === 0) return;

      if (animate && !REDUCED && prevPos && (Math.abs(prevPos.left - curPos.left) > 3 || Math.abs(prevPos.width - curPos.width) > 3)) {
        // Start from previous position
        slider.style.transition = 'none';
        slider.style.width = prevPos.width + 'px';
        slider.style.transform = `translateX(${prevPos.left}px)`;

        // Force reflow
        void slider.offsetWidth;

        // Slide smoothly to target position using the Apple curve
        requestAnimationFrame(() => {
          slider.style.transition = `transform 0.55s ${EASING}, width 0.55s ${EASING}`;
          slider.style.width = curPos.width + 'px';
          slider.style.transform = `translateX(${curPos.left}px)`;
        });
      } else {
        slider.style.width = curPos.width + 'px';
        slider.style.transform = `translateX(${curPos.left}px)`;
      }

      // Save for subsequent navigation
      sessionStorage.setItem('navPrevSlider', JSON.stringify(curPos));
    }

    // Run on frame
    requestAnimationFrame(() => applyTargetPos(true));
    window.addEventListener('load', () => applyTargetPos(false));
    window.addEventListener('resize', () => applyTargetPos(false));

    // Save slider position whenever any nav or internal link is clicked
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const pos = getPosition(link.closest('li') || activeLi);
      if (pos && pos.width > 0) {
        sessionStorage.setItem('navPrevSlider', JSON.stringify(pos));
      }
    }, true);
  }

  /* ═══════════ 2. VIEW-TRANSITION FALLBACK FOR CROSS-DOCUMENT NAV ═══════════ */
  function initNavigationFallback() {
    if (REDUCED) return;
    const hasCrossDocVT = (CSS.supports && CSS.supports('view-transition-name', 'none') && ('navigation' in window));
    if (!hasCrossDocVT) {
      document.body.style.transition = `opacity 0.25s ${EASING}`;
      window.addEventListener('pageshow', function () {
        document.body.style.opacity = '1';
      });
    }
  }

  /* ═══════════ 3. THEME TOGGLE WITH CIRCULAR RIPPLE ANIMATION ═══════════ */
  function applyGlobalTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('themeMode', theme);
    const meta = document.getElementById('browserThemeColor') || document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#030305' : '#f4f6f9');
    if (typeof updateSubnavSlider === 'function') updateSubnavSlider();
    if (typeof updateMainNavSlider === 'function') updateMainNavSlider();
  }

  function initThemeToggle() {
    // Sync theme on initial load
    const saved = localStorage.getItem('themeMode') || 'dark';
    if (document.documentElement.getAttribute('data-theme') !== saved) {
      document.documentElement.setAttribute('data-theme', saved);
    }

    // Sync across open tabs/windows
    window.addEventListener('storage', function (e) {
      if (e.key === 'themeMode' && e.newValue) {
        document.documentElement.setAttribute('data-theme', e.newValue);
        const meta = document.getElementById('browserThemeColor') || document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', e.newValue === 'dark' ? '#030305' : '#f4f6f9');
        if (typeof updateSubnavSlider === 'function') updateSubnavSlider();
        if (typeof updateMainNavSlider === 'function') updateMainNavSlider();
      }
    });

    const themeBtn = document.getElementById('themeBtn');
    if (!themeBtn) return;

    themeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();

      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';

      if (!supportsViewTransitions() || REDUCED) {
        applyGlobalTheme(next);
        return;
      }

      const rect = themeBtn.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = document.startViewTransition(function () {
        applyGlobalTheme(next);
      });

      transition.ready.then(function () {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`
            ]
          },
          {
            duration: 480,
            easing: EASING,
            pseudoElement: '::view-transition-new(root)'
          }
        );
      });
    }, true);
  }

  /* ═══════════ 4. UNIFIED FILTERING, LABELS & SUBPAGE TRANSITIONS ═══════════ */
  function initFilterAndTabTransitions() {
    // ── A. Filter Pills Logic (Research & Writing) ──
    const allFilterPills = document.querySelectorAll('.filter-pill, .fpill');

    function applyFilter(filter, bar) {
      if (!filter || !bar) return;
      const sectionEl = bar.closest('.writing-section, .research-section') || document;
      const sectionId = sectionEl.id || '';

      // 1. Research Publications
      if (sectionId === 'publications' || sectionEl.querySelector('.pub-card')) {
        const cards = sectionEl.querySelectorAll('.pub-card');
        cards.forEach(card => {
          const tags = (card.getAttribute('data-tags') || '').toLowerCase();
          const match = (filter === 'all') || tags.includes(filter);
          card.style.display = match ? '' : 'none';
          if (match) {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }
        });
      }

      // 2. Resources section (toggle groups or cards)
      if (sectionId === 'resources' || sectionEl.querySelector('.resource-section-group')) {
        const groups = sectionEl.querySelectorAll('.resource-section-group');
        groups.forEach(group => {
          const groupName = (group.getAttribute('data-group') || '').toLowerCase();
          const match = (filter === 'all') || (groupName === filter);
          group.style.display = match ? '' : 'none';
          if (match) {
            group.style.opacity = '1';
            group.style.transform = 'translateY(0)';
          }
        });
        const cards = sectionEl.querySelectorAll('.resource-card');
        cards.forEach(card => {
          const tag = (card.getAttribute('data-tag') || '').toLowerCase();
          const match = (filter === 'all') || (tag === filter);
          card.style.display = match ? '' : 'none';
        });
      }

      // 3. Blog & Commentaries & Podcast
      if (sectionId === 'blog' || sectionId === 'commentaries' || sectionId === 'podcast' || sectionEl.querySelector('.entry-card, .commentary-card')) {
        const entryCards = sectionEl.querySelectorAll('.entry-card');
        entryCards.forEach(card => {
          const tag = (card.getAttribute('data-tag') || '').toLowerCase();
          const match = (filter === 'all') || tag.includes(filter);
          card.style.display = match ? '' : 'none';
          if (match) {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }
        });

        const commentaryCards = sectionEl.querySelectorAll('.commentary-card');
        commentaryCards.forEach(card => {
          const tag = (card.getAttribute('data-tag') || '').toLowerCase();
          const match = (filter === 'all') || tag.includes(filter);
          card.style.display = match ? '' : 'none';
          if (match) {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }
        });

        const podcastItems = sectionEl.querySelectorAll('.podcast-item');
        podcastItems.forEach(item => {
          const tag = (item.getAttribute('data-tag') || '').toLowerCase();
          const match = (filter === 'all') || tag.includes(filter);
          item.style.display = match ? '' : 'none';
        });
      }
    }

    // Attach click to filter pills
    allFilterPills.forEach(pill => {
      pill.addEventListener('click', function (e) {
        e.preventDefault();
        const bar = pill.closest('.filter-bar, .filter-row');
        if (!bar) return;
        const pillsInBar = bar.querySelectorAll('.filter-pill, .fpill');
        pillsInBar.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const filter = (pill.getAttribute('data-filter') || pill.getAttribute('data-cat') || pill.textContent.trim()).toLowerCase();
        applyFilter(filter, bar);
      });
    });

    // ── B. Clickable Labels & Tags across the whole site ──
    document.addEventListener('click', function (e) {
      // 1. Blog & Commentary tags (.entry-tag)
      const entryTag = e.target.closest('.entry-tag');
      if (entryTag) {
        e.preventDefault();
        e.stopPropagation();
        const tagText = entryTag.textContent.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const section = entryTag.closest('.writing-section') || document;
        const bar = section.querySelector('.filter-bar');
        if (bar) {
          const pills = Array.from(bar.querySelectorAll('.fpill, .filter-pill'));
          const matchingPill = pills.find(p => {
            const f = (p.getAttribute('data-filter') || p.textContent.trim()).toLowerCase().replace(/[^a-z0-9]/g, '');
            return f === tagText || tagText.includes(f) || f.includes(tagText);
          });
          if (matchingPill) {
            if (matchingPill.classList.contains('active')) {
              // Toggle back to All
              const allPill = pills.find(p => (p.getAttribute('data-filter') || '').toLowerCase() === 'all');
              if (allPill) allPill.click();
            } else {
              matchingPill.click();
            }
          }
        }
        return;
      }

      // 2. Publication tags (.pub-tag)
      const pubTag = e.target.closest('.pub-tag');
      if (pubTag) {
        e.preventDefault();
        e.stopPropagation();
        const tagText = pubTag.textContent.trim().toLowerCase();
        const filterBar = document.querySelector('.filter-row');
        if (filterBar) {
          const pills = Array.from(filterBar.querySelectorAll('.filter-pill'));
          const matchingPill = pills.find(p => {
            const f = (p.getAttribute('data-filter') || p.textContent.trim()).toLowerCase();
            return tagText.includes(f) || f.includes(tagText);
          });
          if (matchingPill) {
            matchingPill.click();
          } else {
            // Direct filter on pub-cards
            document.querySelectorAll('.pub-card').forEach(card => {
              const tags = (card.getAttribute('data-tags') || '').toLowerCase();
              const text = card.textContent.toLowerCase();
              const match = tags.includes(tagText) || text.includes(tagText);
              card.style.display = match ? '' : 'none';
            });
          }
        }
        return;
      }

      // 3. Section labels in Resources (.section-label)
      const secLabel = e.target.closest('.section-label');
      if (secLabel) {
        const group = secLabel.closest('.resource-section-group');
        if (group) {
          const grpName = group.getAttribute('data-group');
          const filterBar = document.querySelector('#resources .filter-bar');
          if (filterBar && grpName) {
            const pill = filterBar.querySelector(`[data-filter="${grpName}"]`);
            if (pill) pill.click();
          }
        }
      }
    });

    // ── C. Subnav Tab Switches (Research: Publications vs Projects) ──
    const researchSubLinks = document.querySelectorAll('#research-subnav-wrapper a[data-section]');
    if (researchSubLinks.length) {
      researchSubLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          const targetId = link.getAttribute('data-section');
          document.querySelectorAll('.research-section').forEach(sec => {
            const isTarget = sec.id === targetId;
            sec.classList.toggle('active', isTarget);
          });
          researchSubLinks.forEach(l => {
            const isMatch = l.getAttribute('data-section') === targetId;
            l.classList.toggle('active-sub', isMatch);
            l.setAttribute('aria-selected', isMatch ? 'true' : 'false');
          });
          if (typeof updateSubnavSlider === 'function') updateSubnavSlider();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    }

    // ── D. Writing Subnav Sections (Blog, Commentaries, Resources, Podcast) ──
    const writingSubLinks = document.querySelectorAll('#writing-subnav a[data-section]');
    if (writingSubLinks.length) {
      writingSubLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          const sec = link.getAttribute('data-section');
          if (typeof switchSection === 'function') {
            switchSection(sec);
          } else {
            document.querySelectorAll('.writing-section').forEach(s => s.classList.toggle('active', s.id === sec));
            writingSubLinks.forEach(l => l.classList.toggle('active-sub', l.getAttribute('data-section') === sec));
          }
        });
      });
    }
  }

  /* ═══════════ 5. STAGGERED SCROLL REVEAL & INSTANT HOVER CLEANUP ═══════════ */
  function initScrollReveal() {
    const rvElements = document.querySelectorAll('.rv');
    if (!rvElements.length) return;

    if (REDUCED) {
      rvElements.forEach(function (el) {
        el.classList.add('in', 'revealed');
      });
      return;
    }

    // Group elements by parent for subtle stagger
    const parentGroups = new Map();
    rvElements.forEach(function (el) {
      const parent = el.parentElement || document.body;
      if (!parentGroups.has(parent)) parentGroups.set(parent, []);
      parentGroups.get(parent).push(el);
    });

    parentGroups.forEach(function (children) {
      children.forEach(function (el, index) {
        const delay = Math.min(index, 4) * 60; // 0ms to 240ms subtle ripple
        el.style.transitionDelay = delay + 'ms';
      });
    });

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add('in');
          // Once animated, remove transition delay so hover micro-interactions feel instant
          setTimeout(function () {
            el.classList.add('revealed');
            el.style.transitionDelay = '0s';
          }, 700);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    rvElements.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ═══════════ 6. MODALS SCALE & FADE CLOSE TRANSITION ═══════════ */
  function initModalTransitions() {
    const modals = document.querySelectorAll('.modal-overlay, .transcript-modal');
    modals.forEach(function (modal) {
      const closeButtons = modal.querySelectorAll('.close-btn-modal, .transcript-modal-close, #closeBtn, #transcriptModalClose');

      function closeModalWithAnimation() {
        if (!modal.classList.contains('active') && !modal.classList.contains('open')) return;
        modal.classList.add('closing');
        setTimeout(function () {
          modal.classList.remove('active', 'open', 'closing');
          document.documentElement.classList.remove('modal-open');
        }, 250);
      }

      closeButtons.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          closeModalWithAnimation();
        }, true);
      });

      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.classList.contains('transcript-modal-bg')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          closeModalWithAnimation();
        }
      }, true);

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && (modal.classList.contains('active') || modal.classList.contains('open'))) {
          closeModalWithAnimation();
        }
      });
    });
  }

  /* ═══════════ 7. SITE-WIDE SEARCH WITH DROPDOWN (CROSS-PAGE) ═══════════ */
  const SITE_SEARCH_INDEX = [
    // Core Pages
    { title: 'Home', section: 'Page', url: 'index.html', desc: 'Personal homepage, research focus, latest updates and welcome notes' },
    { title: 'About Me', section: 'Page', url: 'about.html', desc: 'Biography, research journey, philosophy, and personal profile' },
    { title: 'Photo Gallery Carousel', section: 'About', url: 'about.html#photoCarouselWrap', desc: 'Card carousel of research laboratory, campus, and life photos' },
    { title: 'Photography', section: 'About', url: 'photography.html', desc: 'A full-page visual field notebook with twenty animated photo studies' },
    { title: 'Academic Curriculum Vitae (CV)', section: 'CV', url: 'Uploads/Full_CV academic.pdf', desc: 'Full academic CV, research history, and publication credentials' },
    { title: 'Industry Curriculum Vitae (CV)', section: 'CV', url: 'Uploads/CV for Industry.pdf', desc: 'Industry-oriented CV highlighting materials science and data skill sets' },

    // Research
    { title: 'Research Overview', section: 'Research', url: 'research.html', desc: 'Thermoelectric materials, transport physics, and defect engineering' },
    { title: 'Publications', section: 'Research', url: 'research.html#publications', desc: 'Review articles and research papers on thermoelectric materials' },
    { title: 'Flexible Thermoelectrics Review (PEDOT:PSS)', section: 'Research', url: 'research.html#publications', desc: 'Interface transport physics and energy filtering in Bi-Te with PEDOT:PSS' },
    { title: 'Cu-Sb-Se Defect Engineering', section: 'Research', url: 'research.html#publications', desc: 'Te-alloyed tetrahedrites, band convergence, and zT optimisation' },
    { title: 'Research Projects', section: 'Research', url: 'research.html#projects', desc: 'Band convergence, phonon scattering, and room-temperature solution synthesis' },

    // Writing - Blog
    { title: 'Writing Overview', section: 'Writing', url: 'blog-formal.html', desc: 'Essays, reflections, commentaries, resources and dispatches' },
    { title: 'Why the Seebeck Coefficient Is Not Just a Number', section: 'Blog', url: 'blog-formal.html#blog', desc: 'Formal essay on transport perspective and entropy current density' },
    { title: 'What Does It Mean for a Material to Have a Band Gap?', section: 'Blog', url: 'blog-formal.html#blog', desc: 'Optical, transport, and photoemission measurements explained' },
    { title: 'Three Months of Raman Spectroscopy', section: 'Blog', url: 'blog-formal.html#blog', desc: 'Lab notes on laser alignment, sample damage, and spectral confidence' },
    { title: 'Reading Snyder & Toberer (2008)', section: 'Blog', url: 'blog-formal.html#blog', desc: 'Critical paper review of the landmark Nature Materials zT foundation' },
    { title: 'On Writing a Thesis in LaTeX: A Survival Guide', section: 'Blog', url: 'blog-formal.html#blog', desc: 'Practical tips on TikZ figures, tcolorbox, and biblatex managers' },
    { title: 'Kubelka-Munk and Its Discontents', section: 'Blog', url: 'blog-formal.html#blog', desc: 'Diagnosing diffuse reflectance transformation breakdown with Klein criterion' },

    // Writing - Commentaries
    { title: 'Commentaries (Books & Papers)', section: 'Commentaries', url: 'blog-formal.html#commentaries', desc: 'Close readings and annotations of seminal scientific literature' },
    { title: 'On the Electrodynamics of Moving Bodies (Einstein 1905)', section: 'Commentaries', url: 'blog-formal.html#commentaries', desc: 'Foundational special relativity paper analysis and commentary' },
    { title: 'Electronic Transport in Bismuth Telluride (Goldsmid 1956)', section: 'Commentaries', url: 'blog-formal.html#commentaries', desc: 'Milestone paper on thermoelectric properties of Bi2Te3' },
    { title: 'Solid State Physics — Ashcroft & Mermin', section: 'Commentaries', url: 'blog-formal.html#commentaries', desc: 'Commentary on the definitive graduate condensed matter textbook' },
    { title: 'How to Think Like a Mathematician — Kevin Houston', section: 'Commentaries', url: 'blog-formal.html#commentaries', desc: 'Undergraduate guide to mathematical proof and rigour in science' },

    // Writing - Resources
    { title: 'Physics & Study Resources', section: 'Resources', url: 'blog-formal.html#resources', desc: 'Curated links to thermoelectric societies, drives, textbooks and tools' },
    { title: 'Deutsche Thermoelektrische Gesellschaft (DTG)', section: 'Resources', url: 'https://thermoelektrik.info/', desc: 'Official portal of the German Thermoelectric Society' },
    { title: 'Max-Planck-Institut für Eisenforschung', section: 'Resources', url: 'https://www.mpie.de/en', desc: 'Materials design, defect chemistry, and electron microscopy' },
    { title: 'International Thermoelectric Society (ITS)', section: 'Resources', url: 'https://its.org/', desc: 'Global organization promoting thermoelectric science and devices' },
    { title: 'Introduction to Thermoelectricity — Andrei Novitskii', section: 'Resources', url: 'https://anovitzkij.notion.site/Introduction-to-Thermoelectricity-2e71199f0e10425fa6cc52c3bdad7926#7c3163161801458d800674700d227675', desc: 'Interactive handbook on Seebeck, electrical conductivity, and zT' },
    { title: 'IISER Pune PYQ Drive (Past Exam Papers)', section: 'Resources', url: 'https://drive.google.com/drive/folders/1ve3piM4iU6_AiVmHjFuDhbViA_i_taA3?usp=drive_link', desc: 'Student-maintained archive of past physics semester examination papers' },
    { title: 'Vatsal Garg Physics Lecture Notes', section: 'Resources', url: 'https://drive.google.com/drive/folders/1-11zEhtK2tDj2RIQ3uHImuI3GSzfPW02?usp=drive_link', desc: 'Comprehensive handwritten lecture notes and problem solution sets' },
    { title: 'IISER Pune Reference Books Drive', section: 'Resources', url: 'https://drive.google.com/drive/folders/1jkFnVo72R81BS5LZmVS1JAzmfw1QpJA6?usp=drive_link', desc: 'Textbooks across classical, quantum, and statistical mechanics' },
    { title: 'IISER Pune ERP Student Portal', section: 'Resources', url: 'https://www.iiserpune.in/sam/roott/index.php', desc: 'SAM portal for semester course registration, grades, and records' },
    { title: 'Srinivasa Ramanujan Library Portal', section: 'Resources', url: 'https://www.iiserpune.ac.in/library/', desc: 'IISER Pune library catalog, journal databases, and repositories' },
    { title: 'Belle II International Masterclasses', section: 'Resources', url: 'https://www.belle2.de/en/belle-ii-you/masterclasses', desc: 'High-energy particle physics data analysis masterclass' },
    { title: 'Project YL International Internships', section: 'Resources', url: 'https://projectyl.github.io/inter/', desc: 'Global undergraduate summer research fellowships database' },
    { title: 'FindAPhD Database', section: 'Resources', url: 'https://www.findaphd.com/', desc: 'International database for funded doctoral research positions' },

    // Writing - Podcast
    { title: 'Podcasts & Audio Dispatches', section: 'Podcast', url: 'blog-formal.html#podcast', desc: 'Audio episodes and scientific dispatches' },
    { title: 'The Joy of Why Podcast', section: 'Podcast', url: 'blog-formal.html#podcast', desc: 'Aesthetic evolution, quantum principles, and math explorations' }
  ];

  function initSiteSearch() {
    const containers = document.querySelectorAll('.search-container');
    if (!containers.length) return;

    containers.forEach(container => {
      // Remove any legacy up/down navigation buttons
      container.querySelectorAll('.search-nav, .search-up, .search-down').forEach(btn => btn.remove());

      const trigger = container.querySelector('.search-trigger');
      const input = container.querySelector('.search-input');
      if (!input) return;

      // Ensure dropdown exists
      let dropdown = container.querySelector('.search-dropdown');
      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'search-dropdown';
        container.appendChild(dropdown);
      }

      let focusedIndex = -1;
      let currentMatches = [];

      function resetSearch() {
        dropdown.classList.remove('open');
        dropdown.innerHTML = '';
        input.value = '';
        input.blur();
        container.classList.remove('active');
        currentMatches = [];
        focusedIndex = -1;
      }

      function renderResults(matches) {
        currentMatches = matches;
        focusedIndex = -1;
        dropdown.innerHTML = '';

        if (!matches.length) {
          dropdown.innerHTML = '<div class="search-no-results">No results found</div>';
          dropdown.classList.add('open');
          return;
        }

        matches.forEach((item, idx) => {
          const a = document.createElement('a');
          a.className = 'search-dropdown-item';
          a.href = item.url;
          if (item.url.startsWith('http') || item.url.endsWith('.pdf')) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
          }

          a.innerHTML = `
            <div class="search-item-top">
              <span class="search-item-title">${item.title}</span>
              <span class="search-item-badge">${item.section}</span>
            </div>
            <div class="search-item-desc">${item.desc}</div>
          `;

          a.addEventListener('click', function (e) {
            // Check if navigating to a section on the CURRENT page
            const currentPath = window.location.pathname.split('/').pop() || 'index.html';
            const [itemPath, itemHash] = item.url.split('#');

            if (itemPath === currentPath || (currentPath === '' && itemPath === 'index.html')) {
              if (itemHash) {
                e.preventDefault();
                resetSearch();

                // If page has switchSection, use it
                if (typeof switchSection === 'function') {
                  switchSection(itemHash);
                }
                const targetEl = document.getElementById(itemHash);
                if (targetEl) {
                  targetEl.scrollIntoView({ behavior: 'smooth' });
                }
                window.location.hash = itemHash;
              }
            } else {
              // Clear the fixed search surface before a full page navigation.
              // This prevents the expanded field from being restored by the
              // browser's navigation snapshot.
              resetSearch();
            }
          });

          dropdown.appendChild(a);
        });

        dropdown.classList.add('open');
      }

      function doSearch() {
        const query = input.value.trim().toLowerCase();
        if (!query) {
          dropdown.classList.remove('open');
          dropdown.innerHTML = '';
          currentMatches = [];
          return;
        }

        const tokens = query.split(/\s+/).filter(Boolean);
        const matches = SITE_SEARCH_INDEX.filter(item => {
          const text = (item.title + ' ' + item.section + ' ' + item.desc + ' ' + item.url).toLowerCase();
          return tokens.every(tok => text.includes(tok));
        });

        renderResults(matches);
      }

      input.addEventListener('input', doSearch);
      input.addEventListener('focus', function () {
        if (input.value.trim()) doSearch();
      });

      if (trigger) {
        trigger.addEventListener('click', function (e) {
          e.preventDefault();
          container.classList.toggle('active');
          input.focus();
        });
      }

      input.addEventListener('keydown', function (e) {
        const items = dropdown.querySelectorAll('.search-dropdown-item');
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (!items.length) return;
          focusedIndex = (focusedIndex + 1) % items.length;
          items.forEach((it, idx) => it.classList.toggle('focused', idx === focusedIndex));
          if (items[focusedIndex]) items[focusedIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (!items.length) return;
          focusedIndex = (focusedIndex - 1 + items.length) % items.length;
          items.forEach((it, idx) => it.classList.toggle('focused', idx === focusedIndex));
          if (items[focusedIndex]) items[focusedIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          if (focusedIndex >= 0 && items[focusedIndex]) {
            e.preventDefault();
            items[focusedIndex].click();
          }
        } else if (e.key === 'Escape') {
          resetSearch();
        }
      });

      // Close on outside click
      document.addEventListener('click', function (e) {
        if (!container.contains(e.target)) {
          resetSearch();
        }
      });
    });
  }

  /* ═══════════ INITIALIZE ON DOM READY ═══════════ */
  function init() {
    initNavSliderMemory();
    initNavigationFallback();
    initThemeToggle();
    initFilterAndTabTransitions();
    initScrollReveal();
    initModalTransitions();
    initSiteSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
