class DragContainerElement extends HTMLElement {
  constructor() {
    super();

    this.selectedElement = null;
    this.positions = [];

    this.getIds = () => {
      const ids = [];
      for (let i = 0; i < this.children.length; i++) {
        ids.push(this.children[i].id);
      }
      return ids;
    };

    this.checkOverlap = (e, position) => {
      return e.touches
        ? e.touches[0].clientX < position.right &&
            e.touches[0].clientX > position.left &&
            e.touches[0].clientY < position.bottom &&
            e.touches[0].clientY > position.top &&
            e.touches[0].target !== this
        : e.clientX < position.right &&
            e.clientX > position.left &&
            e.clientY < position.bottom &&
            e.clientY > position.top &&
            e.target !== this.selectedElement &&
            e.target !== this;
    };

    this.updatePositions = () => {
      this.positions = [];
      for (let i = 0; i < this.children.length; i++) {
        this.positions.push({
          element: this.children[i],
          position: this.children[i].getBoundingClientRect(),
        });
      }
    };

    this.handleDown = (e) => {
      const validInteraction = e.touches || e.button === 0;
      const target = e.touches ? e.touches[0].target : e.target;
      if (validInteraction && target !== this) {
        this.selectedElement = target;
      }
    };

    this.handleMove = (e) => {
      if (this.selectedElement) {
        e.preventDefault();
        this.positions.forEach((position, index) => {
          const hasOverlapped = this.checkOverlap(e, position.position);

          if (hasOverlapped) {
            const { top, left } = this.selectedElement.getBoundingClientRect();
            const rowAbove = top < position.position.top;
            const sameRow = top === position.position.top;
            const rowBelow = top > position.position.top;
            const columnBefore = left < position.position.left;
            const sameColumn = left === position.position.left;
            const columnAfter = left > position.position.left;
            const overlappedEl = this.positions[index].element;

            if (rowBelow || (sameRow && columnAfter)) {
              overlappedEl.insertAdjacentElement(
                "beforebegin",
                this.selectedElement
              );
            } else if (rowAbove || (sameRow && columnBefore)) {
              overlappedEl.insertAdjacentElement(
                "afterend",
                this.selectedElement
              );
            }
            this.updatePositions();
          }
        });
      }
    };

    this.handleUp = (e) => {
      if (this.selectedElement) {
        this.selectedElement = null;
      }
    };
  }

  initialiseStyles() {
    this.style.display = "flex";
  }

  initialisePositions() {
    for (let i = 0; i < this.children.length; i++) {
      this.positions.push({
        element: this.children[i],
        position: this.children[i].getBoundingClientRect(),
      });
    }
  }

  connectedCallback() {
    this.initialiseStyles();
    this.initialisePositions();

    window.addEventListener("resize", this.updatePositions);

    this.addEventListener("mousedown", this.handleDown);
    this.addEventListener("touchstart", this.handleDown);

    this.addEventListener("mousemove", this.handleMove);
    this.addEventListener("touchmove", this.handleMove, { passive: false });

    document.addEventListener("mouseup", this.handleUp);
    document.addEventListener("touchend", this.handleUp);
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this.updatePositions);

    this.removeEventListener("mousedown", this.handleDown);
    this.removeEventListener("touchstart", this.handleDown);

    this.removeEventListener("mousemove", this.handleMove);
    this.removeEventListener("touchmove", this.handleMove, { passive: false });

    document.removeEventListener("mouseup", this.handleUp);
    document.removeEventListener("touchend", this.handleUp);
  }
}

class DragBoxElement extends HTMLElement {
  constructor() {
    super();

    this.selected = false;
    this.mouseOffsetX = null;
    this.mouseOffsetY = null;
    this.cloneEl = null;

    this.setupClone = () => {
      const { left, top } = this.getBoundingClientRect();
      const styles = window.getComputedStyle(this);

      this.cloneEl = this.cloneNode(true);

      for (let i = 0; i < styles.length; i++) {
        const styleName = styles[i];
        const styleValue = styles.getPropertyValue(styleName);
        const stylesToIgnore = ["position", "pointerEvents", "left", "top"];

        if (!stylesToIgnore.includes(styleName)) {
          this.cloneEl.style.setProperty(styleName, styleValue);
        }
      }

      this.cloneEl.style.position = "absolute";
      this.cloneEl.style.pointerEvents = "none";
      this.cloneEl.style.left = left + "px";
      this.cloneEl.style.top = top + "px";

      const body = document.querySelector("body");
      body.appendChild(this.cloneEl);
    };

    this.handleDown = (e) => {
      if ((e.button === 0 || e.touches) && !this.selected) {
        const { left, top } = this.getBoundingClientRect();
        if (e.touches) {
          this.mouseOffsetX = e.touches[0].clientX - left;
          this.mouseOffsetY = e.touches[0].clientY - top;
        } else {
          this.mouseOffsetX = e.offsetX;
          this.mouseOffsetY = e.offsetY;
        }

        this.setupClone();
        this.style.opacity = "0.1";
        this.selected = true;
      }
    };

    this.handleMove = (e) => {
      if (this.selected) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        this.cloneEl.style.left = clientX - this.mouseOffsetX + "px";
        this.cloneEl.style.top = clientY - this.mouseOffsetY + "px";
      }
    };

    this.handleUp = (e) => {
      if (this.selected) {
        this.selected = false;
        const body = document.querySelector("body");
        body.removeChild(this.cloneEl);
        this.cloneEl = null;
        this.style.opacity = "1";
      }
    };
  }

  initialiseStyle() {
    this.style.userSelect = "none";
    this.style.boxSizing = "border-box";
  }

  disableUserInputForChildren = (node) => {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      child.style.pointerEvents = "none";
      child.style.userSelect = "none";
      this.disableUserInputForChildren(child);
    }
  };

  connectedCallback() {
    this.initialiseStyle();
    this.disableUserInputForChildren(this);

    this.addEventListener("mousedown", this.handleDown);
    this.addEventListener("touchstart", this.handleDown);

    document.addEventListener("mousemove", this.handleMove);
    document.addEventListener("touchmove", this.handleMove, { passive: false });

    document.addEventListener("mouseup", this.handleUp);
    document.addEventListener("touchend", this.handleUp);
  }

  disconnectedCallback() {
    this.removeEventListener("mousedown", this.handleDown);
    this.removeEventListener("touchstart", this.handleDown);

    document.removeEventListener("mousemove", this.handleMove);
    document.removeEventListener("touchmove", this.handleMove, {
      passive: false,
    });

    document.removeEventListener("mouseup", this.handleUp);
    document.removeEventListener("touchend", this.handleUp);
  }
}

customElements.define("drag-box", DragBoxElement);
customElements.define("drag-container", DragContainerElement);
