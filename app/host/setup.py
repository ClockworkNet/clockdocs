#!/usr/local/bin/python

from distutils.core import setup
from shutil import copyfile
from os import path
import sys 

appid = 'jocddfhehbjkaghkkfnljdheibfppmmf'

# Determine hosts file based on os
if sys.platform == 'linux2':
    hostdir = '.config/google-chrome/NativeMessagingHosts/'
elif sys.platform == 'darwin' or sys.platform == 'os2':
    hostdir = 'Library/Application Support/Google/Chrome/NativeMessagingHosts'
elif sys.platform == 'win32' or sys.platform == 'cygwin':
    print "Windows? Yuck"
    exit()
else:
    print "Unsupported os: " + sys.platform
    exit()

perms = 'com.clockwork.svn.json'
homedir = path.expanduser('~')
clientdir = path.join(homedir, 'bin')

# Replace $HOST_DIR and $APP_ID in permission file
# and copy into appropriate directory
with open(perms, 'r') as sourcefile:
    lines = sourcefile.readlines()
    dst = path.join(homedir, hostdir, perms)
    with open(dst, 'w') as permfile:
        for line in lines:
            line = line.replace('$HOST_DIR', clientdir)
            line = line.replace('$APP_ID', appid)
            permfile.write(line)
        print "Copied {0} to {1}".format(perms, dst)


# Run the "real" setup
setup(name='ClockdocsNativeMessaging',
      version='1.0',
      description='Clockdocs native messaging client',
      author='Clockwork',
      author_email='support@clockwork.net',
      url='http://clockwork.net/',
      scripts=['native_messaging_client.py']
)
