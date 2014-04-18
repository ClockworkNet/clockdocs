#!/usr/local/bin/python

import struct
import subprocess
import sys
import json
import os

#print '{"foo": "bar"}'
#print subprocess.check_output(["svn", "info", "svn+ssh://svn.pozitronic.com/svnroot/projects/bi_worldwide/dpsg"])
os.chdir(os.path.dirname(__file__)+"/svn")

def send_message(message):
	sys.stdout.write(struct.pack('I', len(message)))
	sys.stdout.write(message)
	sys.stdout.flush()

def Main():

	while 1:
		text_length_bytes = sys.stdin.read(4)
		if len(text_length_bytes) == 0:
			sys.exit(0)

		text_length = struct.unpack('i', text_length_bytes)[0]
		text = sys.stdin.read(text_length).decode('utf-8')
		obj = json.loads(text)
		res = subprocess.check_output(obj['command'])
		send_message('{"response": %(response)s}' % {"response": json.dumps(res)})

if __name__ == '__main__':
	Main()