import { participantForUser, shareAmountForUser } from './shareUserAmount';

function sid(value) {
  return String(value == null ? '' : value);
}

export function activeShareCategories(project) {
  return (Array.isArray(project?.categories) ? project.categories : []).filter(function (category) {
    return category && String(category.status || 'active') !== 'deleted';
  });
}

export function shareCategoryById(project, categoryId) {
  var wanted = sid(categoryId);
  if (!wanted) return null;
  return (Array.isArray(project?.categories) ? project.categories : []).find(function (category) {
    return category && sid(category.id) === wanted;
  }) || null;
}

export function fallbackPersonalCategoryId(personalCategories, configuredDefaultId) {
  var categories = (Array.isArray(personalCategories) ? personalCategories : []).filter(function (category) {
    return category && !category.archived && !category.deleted;
  });
  var configured = categories.find(function (category) {
    return sid(category.id) === sid(configuredDefaultId);
  });
  if (configured) return configured.id;
  var canonicalOther = categories.find(function (category) {
    return sid(category.id) === '17';
  });
  if (canonicalOther) return canonicalOther.id;
  var namedOther = categories.find(function (category) {
    var value = String(category.name || '').trim().toLocaleLowerCase('it-IT');
    return ['altro', 'other', 'otro', 'autre', 'sonstiges', 'outro', 'inne', 'overig', 'altele', 'άλλο'].includes(value);
  });
  if (namedOther) return namedOther.id;
  return categories.length ? categories[0].id : 17;
}

export function shareMappingFor(mappings, projectId, shareCategoryId) {
  if (!mappings || typeof mappings !== 'object') return '';
  var projectMap = mappings[sid(projectId)];
  if (!projectMap || typeof projectMap !== 'object') return '';
  return sid(projectMap[sid(shareCategoryId)]);
}

export function resolveSharePersonalCategoryId(options) {
  var project = options?.project || null;
  var activity = options?.activity || null;
  var personalCategories = Array.isArray(options?.personalCategories) ? options.personalCategories : [];
  var fallback = fallbackPersonalCategoryId(personalCategories, options?.defaultCategoryId);
  var shareCategoryId = sid(activity?.shareCategoryId || options?.shareCategoryId);
  if (!project || !shareCategoryId) return fallback;
  var shareCategory = shareCategoryById(project, shareCategoryId);
  if (!shareCategory || String(shareCategory.status || 'active') === 'deleted') return fallback;
  var targetId = shareMappingFor(options?.mappings, project.id, shareCategoryId);
  if (!targetId) return fallback;
  var target = personalCategories.find(function (category) {
    return category && !category.archived && !category.deleted && sid(category.id) === targetId;
  });
  return target ? target.id : fallback;
}

function shareHistoryKey(projectId, activityId) {
  return sid(projectId) + '::' + sid(activityId);
}

export function resolveStoredShareHistoryExpense(expense, mappings, defaultCategoryId, personalCategories) {
  if (!expense || String(expense.source || '') !== 'share_project_history') return expense;
  var project = {
    id: sid(expense.shareProjectId),
    categories: Array.isArray(expense.shareProjectCategoriesSnapshot)
      ? expense.shareProjectCategoriesSnapshot
      : [],
  };
  var activity = { shareCategoryId: sid(expense.shareCategoryId) };
  return {
    ...expense,
    catId: resolveSharePersonalCategoryId({
      project: project,
      activity: activity,
      mappings: mappings,
      defaultCategoryId: defaultCategoryId,
      personalCategories: personalCategories,
    }),
  };
}

export function buildShareAnalyticalExpenses(options) {
  var projects = Array.isArray(options?.projects) ? options.projects : [];
  var userId = options?.userId;
  var existingExpenses = Array.isArray(options?.existingExpenses) ? options.existingExpenses : [];
  var existingKeys = {};
  existingExpenses.forEach(function (expense) {
    if (!expense || String(expense.source || '') !== 'share_project_history') return;
    var key = shareHistoryKey(expense.shareProjectId, expense.shareActivityId);
    if (key !== '::') existingKeys[key] = true;
  });
  var rows = [];
  projects.forEach(function (project) {
    if (!project || String(project.status || '') === 'deleted') return;
    (Array.isArray(project.activities) ? project.activities : []).forEach(function (activity) {
      if (!activity || activity.kind === 'settlement') return;
      var amount = shareAmountForUser(project, activity, userId);
      if (!(amount > 0)) return;
      var activityId = sid(activity.id);
      var key = shareHistoryKey(project.id, activityId);
      if (existingKeys[key]) return;
      var participant = participantForUser(project, userId);
      var foreignShare = activity.originalAmount && Number(activity.amount) > 0
        ? (Number(activity.originalAmount) * amount) / Number(activity.amount)
        : null;
      rows.push({
        id: 'share_analytics_' + sid(project.id) + '_' + activityId + '_' + sid(userId),
        amount: Math.abs(amount),
        originalAmount: foreignShare,
        currency: sid(activity.baseCurrency || options?.baseCurrency || 'EUR'),
        baseCurrency: sid(activity.baseCurrency || options?.baseCurrency || 'EUR'),
        baseAmount: Math.abs(amount),
        exchangeRate: Number(activity.exchangeRate || 1),
        exchangeRateDate: sid(activity.exchangeRateDate),
        exchangeRateSource: sid(activity.exchangeRateSource || 'base'),
        catId: resolveSharePersonalCategoryId({
          project: project,
          activity: activity,
          mappings: options?.mappings,
          defaultCategoryId: options?.defaultCategoryId,
          personalCategories: options?.personalCategories,
        }),
        methodId: null,
        desc: sid(activity.desc || 'Spesa condivisa'),
        date: sid(activity.date),
        createdAt: sid(activity.createdAt || activity.date),
        rateizzato: false,
        rate: 1,
        source: 'share_analytics',
        _share: true,
        _shareProjectId: sid(project.id),
        _shareProjectName: sid(project.name),
        _shareProjectColor: project.color || '#4F8FF7',
        _shareProjectIcon: project.icon || '🤝',
        _shareParticipantId: participant ? sid(participant.id) : '',
        shareProjectId: sid(project.id),
        shareActivityId: activityId,
        shareCategoryId: sid(activity.shareCategoryId),
      });
    });
  });
  return rows;
}

export function buildExpensesForAnalysis(options) {
  var rawExpenses = Array.isArray(options?.expenses) ? options.expenses : [];
  var resolvedRaw = rawExpenses.map(function (expense) {
    return resolveStoredShareHistoryExpense(
      expense,
      options?.mappings,
      options?.defaultCategoryId,
      options?.personalCategories
    );
  });
  var shareRows = buildShareAnalyticalExpenses({
    projects: options?.projects,
    userId: options?.userId,
    mappings: options?.mappings,
    defaultCategoryId: options?.defaultCategoryId,
    personalCategories: options?.personalCategories,
    baseCurrency: options?.baseCurrency,
    existingExpenses: rawExpenses,
  });
  return resolvedRaw.concat(shareRows);
}
