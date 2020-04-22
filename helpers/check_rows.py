# Just quickly check that all rows contain the right number of commas
with open("emojis.csv") as in_file:
    for linenum, row in enumerate(in_file.readlines()):
        count = 0
        for char in row:
            if char == ",":
                count += 1
        if count < 5:
            print(count, row, end=" ")
