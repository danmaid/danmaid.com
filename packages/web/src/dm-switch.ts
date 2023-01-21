export interface DmSwitch {
  switch(): void
  status: boolean
}

export class DmSwitch extends HTMLElement implements DmSwitch {
  innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1934 1932">
    <image width="1934" height="1932" href="dm-switch-cosmo-wide.jpg" />
    <rect id="light" class="off" x="541.47" y="929.59" width="184.24" height="63.53"/>
  </svg>
  <style>
    .on {
      fill: #0f0;
    }
    .off {
      fill: none;
    }
  </style>
  `
  status = false
  light = this.querySelector('#light')

  switch(): void {
    this.status = !this.status
    this.light?.classList.remove(this.status ? 'off' : 'on')
    this.light?.classList.add(this.status ? 'on' : 'off')
  }

  onclick = () => this.switch()
}

customElements.define('dm-switch', DmSwitch)
