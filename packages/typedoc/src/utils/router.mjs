import { basename } from 'node:path';

import { slug } from '@doc-kit/core/generators/metadata/utils/slugger.mjs';
import { KindRouter, PageKind, ReflectionKind } from 'typedoc';

import { signaturesOf } from './reflections.mjs';
import { entryHeading } from '../render/entries.mjs';

/**
 * TypeDoc's kind router (`classes/Watcher.md`), writing Markdown files. The
 * members of `docKitMemberPages` types get a page of their own
 * (`interfaces/BuildOptions.input.md`), `docKitUrlAdapter` adapts the URLs, and
 * members are anchored where doc-kit anchors their headings.
 */
export class DocKitRouter extends KindRouter {
  extension = '.md';

  /**
   * Whether a reflection is a member with a page of its own.
   *
   * @param {import('typedoc').RouterTarget} target
   */
  isMemberPage(target) {
    const owner = target.parent;

    return Boolean(
      target.isDeclaration?.() &&
      target.kindOf(ReflectionKind.SomeMember) &&
      owner?.kindOf(ReflectionKind.ClassOrInterface) &&
      owner.parent?.kindOf(ReflectionKind.ExportContainer) &&
      this.application.options
        .getValue('docKitMemberPages')
        .includes(owner.name)
    );
  }

  /** @param {import('typedoc').RouterTarget} target */
  getPageKind(target) {
    return this.isMemberPage(target)
      ? PageKind.Reflection
      : super.getPageKind(target);
  }

  /**
   * A page's URL before `docKitUrlAdapter`: TypeDoc's (`interfaces/BuildOptions`),
   * or its owner's and its name for a member (`interfaces/BuildOptions.input`).
   *
   * @param {import('typedoc').Reflection} reflection
   */
  getDefaultUrl(reflection) {
    if (!this.isMemberPage(reflection)) {
      return super.getIdealBaseName(reflection);
    }

    const owner = super.getIdealBaseName(reflection.parent);

    return `${owner}.${this.getUrlSafeName(reflection.name)}`;
  }

  /** @param {import('typedoc').Reflection} reflection */
  getIdealBaseName(reflection) {
    const url = this.getDefaultUrl(reflection);
    const adapt = this.application.options.getValue('docKitUrlAdapter');

    return adapt ? adapt(url, reflection) : url;
  }

  /** @param {import('typedoc').Reflection} target */
  createAnchor(target) {
    if (target.isSignature()) {
      return slug(entryHeading(this.application, target.parent, target));
    }

    if (target.isDeclaration()) {
      const [signature] = signaturesOf(target);

      return slug(entryHeading(this.application, target, signature));
    }

    return slug(target.name);
  }

  /**
   * The member with a page of its own a member is, or inherits
   * (`WatchOptions.input` inherits `BuildOptions.input`).
   *
   * @param {import('typedoc').DeclarationReflection} member
   * @returns {import('typedoc').DeclarationReflection | undefined}
   */
  memberPageOf(member) {
    if (this.isMemberPage(member)) {
      return member;
    }

    const inherited = member.inheritedFrom?.reflection;

    return inherited?.isDeclaration()
      ? this.memberPageOf(inherited)
      : undefined;
  }

  /**
   * A link from a page to a reflection: to its member page, its anchor, or
   * the closest parent with one.
   *
   * @param {import('typedoc').Reflection} from
   * @param {import('typedoc').Reflection} target
   */
  linkTo(from, target) {
    let to = (target.isDeclaration() && this.memberPageOf(target)) || target;

    while (to && !this.hasUrl(to)) {
      to = to.parent;
    }

    if (!to) {
      return undefined;
    }

    return this.relativeUrl(from, to) || basename(this.getFullUrl(to));
  }
}
