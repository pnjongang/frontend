import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { SunTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";
import type { HaFormSchema } from "../../../../../components/ha-form/types";
import type { LocalizeFunc } from "../../../../../common/translations/localize";

@customElement("ha-automation-trigger-sun")
export class HaSunTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: SunTrigger;

  private _schema = memoizeOne((localize: LocalizeFunc) => [
    {
      name: "event",
      type: "select",
      required: true,
      options: [
        [
          "sunrise",
          localize(
            "ui.panel.config.automation.editor.triggers.type.sun.sunrise"
          ),
        ],
        [
          "sunset",
          localize(
            "ui.panel.config.automation.editor.triggers.type.sun.sunset"
          ),
        ],
      ],
    },
    { name: "offset", selector: { text: {} } },
  ]);

  public static get defaultConfig() {
    return {
      event: "sunrise" as SunTrigger["event"],
      offset: 0,
    };
  }

  protected render() {
    return html`
      <ha-form
        .schema=${this._schema(this.hass.localize)}
        .data=${this.trigger}
        .hass=${this.hass}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (schema: HaFormSchema): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.triggers.type.sun.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-sun": HaSunTrigger;
  }
}
