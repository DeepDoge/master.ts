import type { TagsNS } from "../core"
import { tagsNS } from "../core"

export namespace CustomTag {
	export type TagName = `${string}${string}-${string}${string}`
}
export let defineCustomTag: {
	(tag: CustomTag.TagName): TagsNS.Builder<HTMLElement>
	<T extends keyof HTMLElementTagNameMap>(
		tag: CustomTag.TagName,
		extendsTag: T,
		extendsElement: { new (): HTMLElementTagNameMap[T] }
	): TagsNS.Builder<HTMLElementTagNameMap[T]>
} = (tag: CustomTag.TagName, extendsTag = "div", extendsElement = HTMLElement) => (
	customElements.define(tag, class extends extendsElement {}, { extends: extendsTag }), tagsNS[tag]!
)