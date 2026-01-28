#!/bin/bash
cd /root/scripts
while true
do
/root/scripts/rtp.py --destination-ip 172.16.0.204
s=$(shuf -i 1-30 -n 1)
echo "`date` Sleeping for $s seconds"
sleep $s
done

