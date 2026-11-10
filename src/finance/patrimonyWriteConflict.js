// Preserve a newer remote Patrimonio group when another client saves unrelated data.
export function preserveNewerPatrimony(local, remote) {
  const out = { ...local };
  for (const [stamp, fields] of [
    ['patrimonioDataUpdatedAt', ['patrimonioValues', 'patrimonioHistory', 'patrimonioNotes']],
    ['patrimonioCatalogUpdatedAt', ['patrimonioAreas', 'patrimonioEntries']],
  ]) {
    if (Number(remote?.[stamp] || 0) <= Number(local?.[stamp] || 0)) continue;
    out[stamp] = remote[stamp];
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(remote, field)) out[field] = remote[field];
      else delete out[field];
    }
  }
  const incoming = remote?.userStateAuthorityV2?.sections?.patrimonioCatalog;
  const existing = local?.userStateAuthorityV2?.sections?.patrimonioCatalog;
  if (Number(incoming?.updatedAtMs || 0) > Number(existing?.updatedAtMs || 0)) {
    out.userStateAuthorityV2 = { ...local.userStateAuthorityV2, sections: {
      ...local.userStateAuthorityV2?.sections, patrimonioCatalog: incoming,
    }};
  }
  return out;
}

// Preference backups are recovery copies, not a newer version of the live
// Patrimonio catalog merely because another preference was saved later.
export function reconcilePatrimonyAuthority(authority, live) {
  if (!authority?.values || typeof authority.values !== 'object') return authority;
  const section = live?.userStateAuthorityV2?.sections?.patrimonioCatalog;
  const flatTs = Number(live?.patrimonioCatalogUpdatedAt || 0);
  const sectionTs = Number(section?.updatedAtMs || 0);
  const sectionValid = Array.isArray(section?.data?.areas) && Array.isArray(section?.data?.entries);
  const useSection = sectionValid && sectionTs >= flatTs;
  const areas = useSection ? section.data.areas : live?.patrimonioAreas;
  const entries = useSection ? section.data.entries : live?.patrimonioEntries;
  const timestamp = useSection ? sectionTs : flatTs;
  if (!timestamp || !Array.isArray(areas) || !Array.isArray(entries)) return authority;
  return { ...authority, __patrimonioCatalogUpdatedAt: timestamp, values: {
    ...authority.values, patrimonio_areas_v1: JSON.stringify(areas),
    patrimonio_entries_v1: JSON.stringify(entries),
  }};
}
