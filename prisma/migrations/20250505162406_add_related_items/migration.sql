-- CreateTable
CREATE TABLE "_RelatedItems" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RelatedItems_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_RelatedItems_B_index" ON "_RelatedItems"("B");

-- AddForeignKey
ALTER TABLE "_RelatedItems" ADD CONSTRAINT "_RelatedItems_A_fkey" FOREIGN KEY ("A") REFERENCES "RoadmapItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelatedItems" ADD CONSTRAINT "_RelatedItems_B_fkey" FOREIGN KEY ("B") REFERENCES "RoadmapItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
