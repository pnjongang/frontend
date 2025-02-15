import "@material/mwc-list/mwc-list-item";
import "@material/mwc-select";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { ensureArray } from "../../../../../common/ensure-array";
import {
  AutomationConfig,
  Trigger,
  TriggerCondition,
} from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-condition-trigger")
export class HaTriggerCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: TriggerCondition;

  @state() private _triggers?: Trigger | Trigger[];

  private _unsub?: UnsubscribeFunc;

  public static get defaultConfig() {
    return {
      id: "",
    };
  }

  connectedCallback() {
    super.connectedCallback();
    const details = { callback: (config) => this._automationUpdated(config) };
    fireEvent(this, "subscribe-automation-config", details);
    this._unsub = (details as any).unsub;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub) {
      this._unsub();
    }
  }

  protected render() {
    const { id } = this.condition;
    if (!this._triggers) {
      return this.hass.localize(
        "ui.panel.config.automation.editor.conditions.type.trigger.no_triggers"
      );
    }
    return html`<mwc-select
      .label=${this.hass.localize(
        "ui.panel.config.automation.editor.conditions.type.trigger.id"
      )}
      .value=${id}
      @selected=${this._triggerPicked}
    >
      ${ensureArray(this._triggers).map((trigger) =>
        trigger.id
          ? html`
              <mwc-list-item .value=${trigger.id}>
                ${trigger.id}
              </mwc-list-item>
            `
          : ""
      )}
    </mwc-select>`;
  }

  private _automationUpdated(config?: AutomationConfig) {
    this._triggers = config?.trigger;
  }

  private _triggerPicked(ev) {
    ev.stopPropagation();
    if (!ev.target.value) {
      return;
    }
    const newTrigger = ev.target.value;
    if (this.condition.id === newTrigger) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this.condition, id: newTrigger },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-trigger": HaTriggerCondition;
  }
}
