#!/bin/sh
i=0
while [ $i -lt 50 ]; do
  tr -dc '0-9' </dev/urandom |  head -c 14
  echo ''
  i=$(($i+1))
done;
