// Navigation only. Native screens retain their own authentication, permissions,
// file selection and destructive-operation checks. Production rejects every route.
export const CHATGPT_TEST_ACTIONS = Object.freeze({
  general_settings: {tab:'settings',settings:'general'},
  currency_settings: {tab:'settings',settings:'general'},
  notification_channels: {tab:'settings',settings:'notifications'},
  rich_notes: {tab:'appunti',settings:null},
  advanced_movements: {tab:'spese',settings:null},
  app_help: {tab:'settings',settings:'support_info'},
  change_email: {tab:'settings',settings:'profile_security'},
  change_password: {tab:'settings',settings:'profile_security'},
  change_phone: {tab:'settings',settings:'profile_personal'},
  profile_photo: {tab:'settings',settings:'profile_personal'},
  account_security: {tab:'settings',settings:'profile_security'},
  account_privacy: {tab:'settings',settings:'profile_privacy'},
  finalize_account_deletion: {tab:'settings',settings:'profile_security'},
  manage_subscription: {tab:'settings',settings:'plans_settings'},
  import_data: {tab:'settings',settings:'data'},
  restore_backup: {tab:'settings',settings:'data'},
  export_data: {tab:'settings',settings:'data'},
  reset_data: {tab:'settings',settings:'data'},
  device_widgets: {tab:'settings',settings:'appearance_widget'},
  device_notifications: {tab:'settings',settings:'notifications'},
  bank_and_card_details: {tab:'appunti',settings:null},
  document_file_picker: {tab:'appunti',settings:null},
  receipt_file_picker: {tab:'spese',settings:null,input:'receipt'},
  voice_input: {tab:'consulenteAI',settings:null},
  share_attachments: {tab:'share',settings:null},
  share_contacts: {tab:'share',settings:null},
  contact_support: {tab:'settings',settings:'support'},
});
export function resolveChatgptTestRoute(raw,environment,projectId){
 if(environment!=='test'||projectId!=='fainance-test-20260823195207')return null;
 try{
  const url=new URL(raw),web=url.protocol==='https:'&&url.hostname==='fainance-test-20260823195207.web.app',native=url.protocol==='fainance:'&&url.hostname==='chatgpt-action';
  if(!web&&!native)return null;
  const action=url.searchParams.get('chatgptAction');if(!Object.hasOwn(CHATGPT_TEST_ACTIONS,action||''))return null;
  const project=url.searchParams.get('shareProject');if(project&&!/^[A-Za-z0-9_-]{1,180}$/.test(project))return null;
  return {...CHATGPT_TEST_ACTIONS[action],action,...(project&&['share_attachments','share_contacts'].includes(action)?{projectId:project}:{})};
 }catch{return null;}
}
