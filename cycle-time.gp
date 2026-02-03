# Gnuplot script for cycle time scatter plot
# Usage: gnuplot -e "datafile='cycle-time.dat'" cycle-time.gp

set terminal svg size 800,600 enhanced font 'Arial,12'
set output 'cycle-time.svg'

set title 'Cycle Time Distribution'
set xlabel 'Completion Date'
set ylabel 'Cycle Time (days)'

set xdata time
set timefmt '%Y-%m-%d'
set format x '%Y-%m-%d'
set xtics rotate by -45

set grid
set style fill solid 0.5
set pointsize 1.5

plot '-' using 1:2 with points pt 7 lc rgb '#3498db' title 'Work Items'
# date	cycle_time	id
2022-12-25	38.89	I_kwDOHzRmlM5Wj1bJ
2023-10-01	318.75	I_kwDOHzRmlM5Wj1oJ
2022-11-17	0.25	I_kwDOHzRmlM5WkBkl
2022-12-07	18.76	I_kwDOHzRmlM5Wxx9w
2022-12-26	37.07	I_kwDOHzRmlM5W0Z6z
2022-12-07	0.20	I_kwDOHzRmlM5YPII2
2022-12-13	0.20	I_kwDOHzRmlM5ZDPdY
2022-12-13	0.34	I_kwDOHzRmlM5ZDRpU
2022-12-13	0.19	I_kwDOHzRmlM5ZDYqA
2022-12-13	0.02	I_kwDOHzRmlM5ZHa_m
2022-12-13	0.02	I_kwDOHzRmlM5ZHdc5
2023-10-13	301.99	I_kwDOHzRmlM5ZWi5Q
2022-12-19	0.03	I_kwDOHzRmlM5ZiMpG
2022-12-26	0.05	I_kwDOHzRmlM5aB5oG
2022-12-31	0.67	I_kwDOHzRmlM5aTLPR
2023-01-06	0.20	I_kwDOHzRmlM5awgjm
2023-01-07	0.04	I_kwDOHzRmlM5a1Yup
2023-01-13	2.16	I_kwDOHzRmlM5bJQ0l
2023-01-12	0.74	I_kwDOHzRmlM5bMZSm
2023-01-13	0.91	I_kwDOHzRmlM5bNCB7
2023-01-14	0.01	I_kwDOHzRmlM5bZ1K6
2023-02-19	34.14	I_kwDOHzRmlM5bbwH8
2023-09-12	232.26	I_kwDOHzRmlM5cjTz3
2023-01-27	1.47	I_kwDOHzRmlM5c2r51
2023-01-27	0.17	I_kwDOHzRmlM5c-Jfv
2024-06-13	502.19	I_kwDOHzRmlM5dCTfJ
2023-02-08	0.92	I_kwDOHzRmlM5d4F8W
2023-02-19	10.21	I_kwDOHzRmlM5d-czj
2023-02-19	7.83	I_kwDOHzRmlM5eNq1V
2023-03-16	0.67	I_kwDOHzRmlM5g-A01
2023-10-13	204.55	I_kwDOHzRmlM5hkovK
2023-08-11	141.28	I_kwDOHzRmlM5hk0gM
2023-08-10	130.16	I_kwDOHzRmlM5iaGL0
2023-08-11	127.42	I_kwDOHzRmlM5iwg-I
2023-04-18	0.01	I_kwDOHzRmlM5ju21G
2023-10-13	148.67	I_kwDOHzRmlM5mOGJQ
2023-06-04	0.15	I_kwDOHzRmlM5nvJm9
2023-08-11	58.24	I_kwDOHzRmlM5osRG1
2023-06-25	0.13	I_kwDOHzRmlM5psbPX
2023-08-03	12.52	I_kwDOHzRmlM5sR8PI
2023-08-20	26.52	I_kwDOHzRmlM5sYxxa
2023-09-30	18.27	I_kwDOHzRmlM5w0XCK
2024-06-13	267.35	I_kwDOHzRmlM5xiEJO
2023-10-14	7.32	I_kwDOHzRmlM5zE_4c
2023-10-18	0.08	I_kwDOHzRmlM50QFUp
2024-06-13	229.45	I_kwDOHzRmlM51NpqF
2023-12-29	2.10	I_kwDOHzRmlM56oTAO
2024-01-30	17.87	I_kwDOHzRmlM577pCR
2024-06-13	146.23	I_kwDOHzRmlM58nE-A
2024-01-22	2.65	I_kwDOHzRmlM58r0Wc
2024-02-23	11.66	I_kwDOHzRmlM5-6xeR
2024-02-23	7.71	I_kwDOHzRmlM5_awMi
2024-06-13	106.39	I_kwDOHzRmlM6AqFFo
2024-06-13	100.10	I_kwDOHzRmlM6BU-BK
2024-04-02	0.05	I_kwDOHzRmlM6EYXtn
2024-07-06	10.82	I_kwDOHzRmlM6NfFvi
2024-10-08	1.49	I_kwDOHzRmlM6ZMf2h
2025-07-26	10.87	I_kwDOHzRmlM7AkWN_
e
