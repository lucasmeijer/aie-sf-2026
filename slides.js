import { Application, Controller } from './node_modules/@hotwired/stimulus/dist/stimulus.js';

class DeckController extends Controller {
  disconnect() {
    clearTimeout(this.wheelTimer);
  }

  keydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    if (event.target.closest('input, textarea, select, video, [contenteditable="true"]')) return;
    const direction = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': event.shiftKey ? -1 : 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 }[event.key];
    if (!direction) return;
    event.preventDefault();
    this.move(direction);
  }

  wheel(event) {
    if (event.altKey || event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    const busy = this.wheelTimer;
    clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => { this.wheelTimer = null; }, 180);
    if (!busy) this.move(Math.sign(event.deltaY));
  }

  move(direction) {
    const slides = [...this.element.querySelectorAll('.slide')];
    const index = slides.findIndex(slide => {
      const bounds = slide.getBoundingClientRect();
      return bounds.top <= innerHeight / 2 && bounds.bottom > innerHeight / 2;
    });
    const build = this.application.getControllerForElementAndIdentifier(slides[index], 'build');
    if (build) {
      build.move(direction);
    } else {
      const next = slides[Math.max(0, Math.min(slides.length - 1, index + direction))];
      next.scrollIntoView({ behavior: 'instant' });
      history.replaceState(null, '', `#${next.id || 'slide-1'}`);
    }
  }
}

class SlideVideoController extends Controller {
  connect() {
    this.observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio < 0.5) this.pause();
    }, { threshold: 0.5 });
    this.observer.observe(this.element.closest('.slide'));
  }

  disconnect() {
    this.observer.disconnect();
    this.pause();
  }

  pause() {
    this.element.pause();
  }

  visibility() {
    if (document.hidden) this.pause();
  }
}

class PresenterController extends Controller {
  static targets = ['controls', 'slider', 'amount', 'frame'];

  keydown(event) {
    if (event.altKey) {
      this.controlsTarget.hidden = false;
      this.frameTarget.hidden = false;
    }
  }

  keyup(event) {
    if (!event.altKey) this.hide();
  }

  hide() {
    this.controlsTarget.hidden = true;
    this.frameTarget.hidden = true;
  }

  adjust() {
    const space = Number(this.sliderTarget.value);
    const scale = 1 - space / 100;
    const style = document.documentElement.style;
    style.setProperty('--presentation-scale', scale);
    style.setProperty('--presentation-frame-side', `${space / 2}vw`);
    style.setProperty('--presentation-frame-bottom', `${space}svh`);
    this.amountTarget.value = `${space}%`;
  }
}

class BuildController extends Controller {
  static targets = ['stage', 'diagram'];
  static values = { descriptions: { type: Array, default: [
      'A person',
      'A person with an idea',
      'A person sends an instruction to a coding agent',
      'A second person looks at the coding agent output',
    ] } };

  connect() {
    this.step = 0;
    this.element.dataset.buildStep = this.step;
  }

  next() {
    this.move(1);
  }

  move(direction) {
    const next = this.step + direction;
    if (next < 0 || next > this.stageTargets.length) {
      const neighbor = direction > 0 ? this.element.nextElementSibling : this.element.previousElementSibling;
      if (neighbor) {
        neighbor.scrollIntoView({ behavior: 'instant' });
        history.replaceState(null, '', `#${neighbor.id}`);
      }
      return;
    }
    this.step = next;
    this.element.dataset.buildStep = this.step;
    this.stageTargets.forEach((stage, index) => { stage.toggleAttribute('hidden', index >= this.step); });
    this.diagramTarget.setAttribute('aria-label', this.descriptionsValue[this.step]);
  }
}

const application = Application.start();
application.register('deck', DeckController);
application.register('build', BuildController);
application.register('presenter', PresenterController);
application.register('slide-video', SlideVideoController);
