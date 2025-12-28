class Lang extends HTMLElement {
    constructor() {
        super();
        this.content = this;
    }

    static get observedAttributes() {
        return ['src', 'tag', 'key'];
    }

    connectedCallback() {

    }

    disconnectedCallback() {

    }

    attributeChangedCallback(attrName, oldVal, newVal) {
        if (attrName == "src") {
            //
            return;
        }
        if (attrName == 'tag') {

            let defaultContent;
            if (this.content) {
                defaultContent = this.content.innerHTML;
            }
            if (newVal == '') {
                this.content = this;
            }
            else {
                this.content = document.createElement(newVal);
                this.innerHTML = '';
                this.appendChild(this.content);
            }
            this.content.innerHTML = defaultContent;
            return;
        }
        this.content.innerHTML = newVal;

    }

}

customElements.define('lang-sys', Lang);