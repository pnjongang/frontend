import "@material/mwc-list/mwc-list-item";
import "@material/mwc-select/mwc-select";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  array,
  assert,
  assign,
  boolean,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/entity/ha-entities-picker";
import type { HomeAssistant } from "../../../../types";
import type { CalendarCardConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import "../../components/hui-theme-select-editor";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(union([string(), boolean()])),
    initial_view: optional(string()),
    theme: optional(string()),
    entities: array(string()),
  })
);

const views = ["dayGridMonth", "dayGridDay", "listWeek"];

@customElement("hui-calendar-card-editor")
export class HuiCalendarCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) private _config?: CalendarCardConfig;

  @state() private _configEntities?: string[];

  public setConfig(config: CalendarCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = config.entities;
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _initial_view(): string {
    return this._config!.initial_view || "dayGridMonth";
  }

  get _theme(): string {
    return this._config!.theme || "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <div class="side-by-side">
          <paper-input
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.title"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value=${this._title}
            .configValue=${"title"}
            @value-changed=${this._valueChanged}
          ></paper-input>
          <mwc-select
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.calendar.inital_view"
            )}
            .value=${this._initial_view}
            .configValue=${"initial_view"}
            @selected=${this._viewChanged}
            @closed=${stopPropagation}
          >
            ${views.map(
              (view) => html`
                <mwc-list-item .value=${view}
                  >${this.hass!.localize(
                    `ui.panel.lovelace.editor.card.calendar.views.${view}`
                  )}
                </mwc-list-item>
              `
            )}
          </mwc-select>
        </div>
        <hui-theme-select-editor
          .hass=${this.hass}
          .value=${this._theme}
          .configValue=${"theme"}
          @value-changed=${this._valueChanged}
        ></hui-theme-select-editor>
      </div>
      <h3>
        ${this.hass.localize(
          "ui.panel.lovelace.editor.card.calendar.calendar_entities"
        ) +
        " (" +
        this.hass!.localize("ui.panel.lovelace.editor.card.config.required") +
        ")"}
      </h3>
      <ha-entities-picker
        .hass=${this.hass!}
        .value=${this._configEntities}
        .includeDomains=${["calendar"]}
        @value-changed=${this._valueChanged}
      >
      </ha-entities-picker>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent | CustomEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target! as EditorTarget;

    if (this[`_${target.configValue}`] === target.value) {
      return;
    }

    if (ev.detail && ev.detail.value && Array.isArray(ev.detail.value)) {
      this._config = { ...this._config, entities: ev.detail.value };
    } else if (target.configValue) {
      if (target.value === "") {
        this._config = { ...this._config };
        delete this._config[target.configValue!];
      } else {
        this._config = {
          ...this._config,
          [target.configValue]: target.value,
        };
      }
    }

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _viewChanged(ev): void {
    if (!this._config || !this.hass) {
      return;
    }

    if (ev.target.value === "") {
      this._config = { ...this._config };
      delete this._config.initial_view;
    } else {
      this._config = {
        ...this._config,
        initial_view: ev.target.value,
      };
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles(): CSSResultGroup {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-calendar-card-editor": HuiCalendarCardEditor;
  }
}
