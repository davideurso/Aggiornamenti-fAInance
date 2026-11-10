import sys,zipfile,plistlib,json,hashlib,pathlib,subprocess,tempfile,platform
ipa=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(ipa) as z:
    root=next(n.rsplit('/',1)[0]+'/' for n in z.namelist() if n.startswith('Payload/') and n.count('/')==2 and n.endswith('/Info.plist'))
    info=plistlib.loads(z.read(root+'Info.plist'))
    assert info['CFBundleIdentifier']=='it.fainanceapp.app'
    assert info['CFBundleShortVersionString']=='2.2.0' and info['CFBundleVersion']=='272'
    assert info['ITSAppUsesNonExemptEncryption'] is False
    google=plistlib.loads(z.read(root+'GoogleService-Info.plist'))
    assert google['PROJECT_ID']=='fainance-a7794'
    config=json.loads(z.read(root+'capacitor.config.json'))
    assert config['appId']=='it.fainanceapp.app'
    assert config['plugins']['FirebaseAuthentication']['authDomain']=='auth.fainanceapp.it'
    widget=next(n for n in z.namelist() if '.appex/Info.plist' in n)
    wi=plistlib.loads(z.read(widget))
    assert wi['CFBundleIdentifier']=='it.fainanceapp.app.widgets' and wi['CFBundleVersion']=='272' and wi['CFBundleShortVersionString']=='2.2.0'
    assets=0
    if pathlib.Path('dist').exists():
        for p in pathlib.Path('dist').rglob('*'):
            if p.is_file():
                assert hashlib.sha256(p.read_bytes()).digest()==hashlib.sha256(z.read(root+'public/'+p.relative_to('dist').as_posix())).digest(),str(p)
                assets+=1
    if platform.system()=='Darwin':
        with tempfile.TemporaryDirectory() as tmp:
            z.extractall(tmp)
            subprocess.run(['codesign','--verify','--deep','--strict',str(pathlib.Path(tmp)/root)],check=True)
            signature=subprocess.check_output(['codesign','-dvv',str(pathlib.Path(tmp)/root)],stderr=subprocess.STDOUT,text=True)
            assert 'TeamIdentifier=SSV4P8694F' in signature
            profile=plistlib.loads(subprocess.check_output(['security','cms','-D','-i',str(pathlib.Path(tmp)/root/'embedded.mobileprovision')]))
            assert profile['Entitlements']['application-identifier']=='SSV4P8694F.it.fainanceapp.app'
            assert profile['Entitlements'].get('get-task-allow') is not True
            assert not profile.get('ProvisionedDevices') and not profile.get('ProvisionsAllDevices')
report={'status':'IPA_VERIFIED','version':'2.2.0','build':272,'bundleId':info['CFBundleIdentifier'],'firebaseProject':google['PROJECT_ID'],'bytes':ipa.stat().st_size,'sha256':hashlib.sha256(ipa.read_bytes()).hexdigest(),'webAssetsVerified':assets,'signatureVerifiedOnMac':platform.system()=='Darwin'}
pathlib.Path('testflight-verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
