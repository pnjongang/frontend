import "@material/mwc-select";
import "@material/mwc-list/mwc-list-item";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { fetchCloudStatus, updateCloudPref } from "../../data/cloud";
import {
  CloudTTSInfo,
  getCloudTTSInfo,
  getCloudTtsLanguages,
  getCloudTtsSupportedGenders,
} from "../../data/cloud/tts";
import { MediaPlayerBrowseAction } from "../../data/media-player";
import { HomeAssistant } from "../../types";
import "../ha-textarea";
import { buttonLinkStyle } from "../../resources/styles";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { LocalStorage } from "../../common/decorators/local-storage";

@customElement("ha-browse-media-tts")
class BrowseMediaTTS extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public item;

  @property() public action!: MediaPlayerBrowseAction;

  @state() private _cloudDefaultOptions?: [string, string];

  @state() private _cloudOptions?: [string, string];

  @state() private _cloudTTSInfo?: CloudTTSInfo;

  @LocalStorage("cloudTtsTryMessage", false, false) private _message!: string;

  protected render() {
    return html`
      <ha-textarea
        autogrow
        .label=${this.hass.localize("ui.panel.media-browser.tts.message")}
        .value=${this._message ||
        this.hass.localize("ui.panel.media-browser.tts.example_message", {
          name: this.hass.user?.name || "",
        })}
      >
      </ha-textarea>
      ${this._cloudDefaultOptions ? this._renderCloudOptions() : ""}
      <div class="actions">
        ${this._cloudDefaultOptions &&
        (this._cloudDefaultOptions![0] !== this._cloudOptions![0] ||
          this._cloudDefaultOptions![1] !== this._cloudOptions![1])
          ? html`
              <button class="link" @click=${this._storeDefaults}>
                ${this.hass.localize(
                  "ui.panel.media-browser.tts.set_as_default"
                )}
              </button>
            `
          : html`<span></span>`}
        <mwc-button raised label="Say" @click=${this._ttsClicked}></mwc-button>
      </div>
    `;
  }

  private _renderCloudOptions() {
    const languages = this.getLanguages(this._cloudTTSInfo);
    const selectedVoice = this._cloudOptions!;
    const genders = this.getSupportedGenders(
      selectedVoice[0],
      this._cloudTTSInfo,
      this.hass.localize
    );

    return html`
      <div class="cloud-options">
        <mwc-select
          fixedMenuPosition
          naturalMenuWidth
          .label=${this.hass.localize("ui.panel.media-browser.tts.language")}
          .value=${selectedVoice[0]}
          @selected=${this._handleLanguageChange}
        >
          ${languages.map(
            ([key, label]) =>
              html`<mwc-list-item .value=${key}>${label}</mwc-list-item>`
          )}
        </mwc-select>

        <mwc-select
          fixedMenuPosition
          naturalMenuWidth
          .label=${this.hass.localize("ui.panel.media-browser.tts.gender")}
          .value=${selectedVoice[1]}
          @selected=${this._handleGenderChange}
        >
          ${genders.map(
            ([key, label]) =>
              html`<mwc-list-item .value=${key}>${label}</mwc-list-item>`
          )}
        </mwc-select>
      </div>
    `;
  }

  protected override willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (changedProps.has("message")) {
      return;
    }

    // Re-rendering can reset message because textarea content is newer than local storage.
    // But we don't want to write every keystroke to local storage.
    // So instead we just do it when we're going to render.
    const message = this.shadowRoot!.querySelector("ha-textarea")?.value;
    if (message !== undefined && message !== this._message) {
      this._message = message;
    }
  }

  async _handleLanguageChange(ev) {
    if (ev.target.value === this._cloudOptions![0]) {
      return;
    }
    this._cloudOptions = [ev.target.value, this._cloudOptions![1]];
  }

  async _handleGenderChange(ev) {
    if (ev.target.value === this._cloudOptions![1]) {
      return;
    }
    this._cloudOptions = [this._cloudOptions![0], ev.target.value];
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has("item")) {
      if (this.isCloudItem && !this._cloudTTSInfo) {
        getCloudTTSInfo(this.hass).then((info) => {
          this._cloudTTSInfo = info;
        });
        fetchCloudStatus(this.hass).then((status) => {
          if (status.logged_in) {
            this._cloudDefaultOptions = status.prefs.tts_default_voice;
            this._cloudOptions = { ...this._cloudDefaultOptions };
          }
        });
      }
    }
  }

  private getLanguages = memoizeOne(getCloudTtsLanguages);

  private getSupportedGenders = memoizeOne(getCloudTtsSupportedGenders);

  private get isCloudItem(): boolean {
    return this.item.media_content_id === "media-source://tts/cloud";
  }

  private async _ttsClicked(): Promise<void> {
    const message = this.shadowRoot!.querySelector("ha-textarea")!.value;
    this._message = message;
    const item = { ...this.item };
    const query = new URLSearchParams();
    query.append("message", message);
    if (this._cloudOptions) {
      query.append("language", this._cloudOptions[0]);
      query.append("gender", this._cloudOptions[1]);
    }
    item.media_content_id += `?${query.toString()}`;
    item.can_play = true;
    fireEvent(this, "media-picked", { item });
  }

  private async _storeDefaults() {
    const oldDefaults = this._cloudDefaultOptions!;
    this._cloudDefaultOptions = [...this._cloudOptions!];
    try {
      await updateCloudPref(this.hass, {
        tts_default_voice: this._cloudDefaultOptions,
      });
    } catch (err: any) {
      this._cloudDefaultOptions = oldDefaults;
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.media-browser.tts.faild_to_store_defaults",
          { error: err.message || err }
        ),
      });
    }
  }

  static override styles = [
    buttonLinkStyle,
    css`
      :host {
        margin: 16px auto;
        padding: 0 8px;
        display: flex;
        flex-direction: column;
        max-width: 400px;
      }
      .cloud-options {
        margin-top: 16px;
        display: flex;
        justify-content: space-between;
      }
      .cloud-options mwc-select {
        width: 48%;
      }

      .actions {
        display: flex;
        justify-content: space-between;
        margin-top: 16px;
      }
      button.link {
        color: var(--primary-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-browse-media-tts": BrowseMediaTTS;
  }
}
