package com.tracker.spese.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;

import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "FainanceContacts",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_CONTACTS }, alias = "contacts")
    }
)
public class FainanceContactsPlugin extends Plugin {

    @PluginMethod
    public void pickContact(PluginCall call) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) {
            openContactPicker(call);
        } else {
            requestPermissionForAlias("contacts", call, "contactsPermsCallback");
        }
    }


    @PluginMethod
    public void getContacts(PluginCall call) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) {
            readContacts(call);
        } else {
            requestPermissionForAlias("contacts", call, "contactsListPermsCallback");
        }
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("readContacts", permissionValue());
        ret.put("contacts", permissionValue());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("readContacts", "granted");
            ret.put("contacts", "granted");
            call.resolve(ret);
        } else {
            requestPermissionForAlias("contacts", call, "contactsPermsCallbackResolveOnly");
        }
    }


    @PermissionCallback
    private void contactsListPermsCallback(PluginCall call) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) {
            readContacts(call);
        } else {
            call.reject("Permesso rubrica non concesso.");
        }
    }

    @PermissionCallback
    private void contactsPermsCallback(PluginCall call) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) {
            openContactPicker(call);
        } else {
            call.reject("Permesso rubrica non concesso.");
        }
    }

    @PermissionCallback
    private void contactsPermsCallbackResolveOnly(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("readContacts", permissionValue());
        ret.put("contacts", permissionValue());
        call.resolve(ret);
    }

    private String permissionValue() {
        return getPermissionState("contacts") == PermissionState.GRANTED ? "granted" : "denied";
    }

    private void openContactPicker(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity Android non disponibile.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI);
        try {
            startActivityForResult(call, intent, "pickContactResult");
        } catch (Exception e) {
            call.reject("Impossibile aprire la rubrica.", e);
        }
    }

    @ActivityCallback
    private void pickContactResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        try {
            if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
                JSObject ret = new JSObject();
                ret.put("cancelled", true);
                call.resolve(ret);
                return;
            }
            Uri contactUri = result.getData().getData();
            if (contactUri == null) {
                call.reject("Contatto non valido.");
                return;
            }

            String contactId = "";
            String name = "";
            Cursor contactCursor = getContext().getContentResolver().query(
                    contactUri,
                    new String[]{ContactsContract.Contacts._ID, ContactsContract.Contacts.DISPLAY_NAME_PRIMARY},
                    null,
                    null,
                    null
            );
            if (contactCursor != null) {
                try {
                    if (contactCursor.moveToFirst()) {
                        int idIdx = contactCursor.getColumnIndex(ContactsContract.Contacts._ID);
                        int nameIdx = contactCursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME_PRIMARY);
                        if (idIdx >= 0) contactId = safeString(contactCursor.getString(idIdx));
                        if (nameIdx >= 0) name = safeString(contactCursor.getString(nameIdx));
                    }
                } finally {
                    contactCursor.close();
                }
            }

            String email = "";
            if (!contactId.isEmpty()) {
                Cursor emailCursor = getContext().getContentResolver().query(
                        ContactsContract.CommonDataKinds.Email.CONTENT_URI,
                        new String[]{ContactsContract.CommonDataKinds.Email.ADDRESS},
                        ContactsContract.CommonDataKinds.Email.CONTACT_ID + " = ?",
                        new String[]{contactId},
                        null
                );
                if (emailCursor != null) {
                    try {
                        if (emailCursor.moveToFirst()) {
                            int idx = emailCursor.getColumnIndex(ContactsContract.CommonDataKinds.Email.ADDRESS);
                            if (idx >= 0) email = safeString(emailCursor.getString(idx));
                        }
                    } finally {
                        emailCursor.close();
                    }
                }
            }

            String phone = "";
            if (!contactId.isEmpty()) {
                Cursor phoneCursor = getContext().getContentResolver().query(
                        ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                        new String[]{ContactsContract.CommonDataKinds.Phone.NUMBER},
                        ContactsContract.CommonDataKinds.Phone.CONTACT_ID + " = ?",
                        new String[]{contactId},
                        null
                );
                if (phoneCursor != null) {
                    try {
                        if (phoneCursor.moveToFirst()) {
                            int idx = phoneCursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                            if (idx >= 0) phone = safeString(phoneCursor.getString(idx));
                        }
                    } finally {
                        phoneCursor.close();
                    }
                }
            }

            JSObject contact = new JSObject();
            contact.put("id", contactId);
            contact.put("name", name);
            contact.put("displayName", name);
            contact.put("email", email);
            contact.put("phone", phone);

            JSObject ret = new JSObject();
            ret.put("contact", contact);
            ret.put("name", name);
            ret.put("email", email);
            ret.put("phone", phone);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Impossibile leggere il contatto selezionato.", e);
        }
    }


    private void readContacts(PluginCall call) {
        int limit = 500;
        try {
            Integer requestedLimit = call.getInt("limit");
            if (requestedLimit != null && requestedLimit > 0) limit = Math.min(requestedLimit, 1000);
        } catch (Exception ignored) {}

        JSArray contacts = new JSArray();
        Cursor cursor = null;
        try {
            cursor = getContext().getContentResolver().query(
                    ContactsContract.Contacts.CONTENT_URI,
                    new String[]{ContactsContract.Contacts._ID, ContactsContract.Contacts.DISPLAY_NAME_PRIMARY},
                    null,
                    null,
                    ContactsContract.Contacts.DISPLAY_NAME_PRIMARY + " ASC"
            );
            if (cursor != null) {
                int count = 0;
                while (cursor.moveToNext() && count < limit) {
                    int idIdx = cursor.getColumnIndex(ContactsContract.Contacts._ID);
                    int nameIdx = cursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME_PRIMARY);
                    String contactId = idIdx >= 0 ? safeString(cursor.getString(idIdx)) : "";
                    String name = nameIdx >= 0 ? safeString(cursor.getString(nameIdx)) : "";
                    if (contactId.isEmpty() && name.isEmpty()) continue;

                    JSObject contact = new JSObject();
                    contact.put("id", contactId);
                    contact.put("name", name);
                    contact.put("displayName", name);
                    contact.put("email", firstEmail(contactId));
                    contact.put("phone", firstPhone(contactId));
                    contacts.put(contact);
                    count++;
                }
            }
            JSObject ret = new JSObject();
            ret.put("contacts", contacts);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Impossibile leggere la rubrica.", e);
        } finally {
            if (cursor != null) cursor.close();
        }
    }

    private String firstEmail(String contactId) {
        if (contactId == null || contactId.isEmpty()) return "";
        Cursor emailCursor = null;
        try {
            emailCursor = getContext().getContentResolver().query(
                    ContactsContract.CommonDataKinds.Email.CONTENT_URI,
                    new String[]{ContactsContract.CommonDataKinds.Email.ADDRESS},
                    ContactsContract.CommonDataKinds.Email.CONTACT_ID + " = ?",
                    new String[]{contactId},
                    null
            );
            if (emailCursor != null && emailCursor.moveToFirst()) {
                int idx = emailCursor.getColumnIndex(ContactsContract.CommonDataKinds.Email.ADDRESS);
                if (idx >= 0) return safeString(emailCursor.getString(idx));
            }
        } catch (Exception ignored) {
        } finally {
            if (emailCursor != null) emailCursor.close();
        }
        return "";
    }

    private String firstPhone(String contactId) {
        if (contactId == null || contactId.isEmpty()) return "";
        Cursor phoneCursor = null;
        try {
            phoneCursor = getContext().getContentResolver().query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    new String[]{ContactsContract.CommonDataKinds.Phone.NUMBER},
                    ContactsContract.CommonDataKinds.Phone.CONTACT_ID + " = ?",
                    new String[]{contactId},
                    null
            );
            if (phoneCursor != null && phoneCursor.moveToFirst()) {
                int idx = phoneCursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                if (idx >= 0) return safeString(phoneCursor.getString(idx));
            }
        } catch (Exception ignored) {
        } finally {
            if (phoneCursor != null) phoneCursor.close();
        }
        return "";
    }

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }
}
