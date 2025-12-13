-- Enhanced trigger to handle UPDATE and DELETE properly
CREATE OR REPLACE FUNCTION public.handle_stock_deletion_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    restore_setting BOOLEAN;
BEGIN
    -- Handle UPDATE: restore old chassis, delete new chassis
    IF (TG_OP = 'UPDATE' AND OLD.chassis_no != NEW.chassis_no) THEN
        -- Restore old chassis to stock
        IF NOT EXISTS (SELECT 1 FROM public.stock WHERE user_id = OLD.user_id AND chassis_no = OLD.chassis_no) THEN
            INSERT INTO public.stock (user_id, model_name, chassis_no, engine_no, colour, price, gst, hsn, purchase_date, created_at, category)
            SELECT
                p.user_id,
                (item->>'modelName')::text,
                (item->>'chassisNo')::text,
                (item->>'engineNo')::text,
                (item->>'colour')::text,
                (item->>'price')::numeric,
                (item->>'gst')::text,
                (item->>'hsn')::text,
                p.invoice_date,
                NOW(),
                (item->>'category')::text
            FROM public.purchases p, jsonb_array_elements(p.items) as item
            WHERE p.user_id = OLD.user_id AND (item->>'chassisNo')::text = OLD.chassis_no
            LIMIT 1;
        END IF;
        
        -- Delete new chassis from stock
        DELETE FROM public.stock
        WHERE user_id = NEW.user_id AND chassis_no = NEW.chassis_no;
        
        RETURN NEW;
    END IF;
    
    -- Handle INSERT: delete from stock
    IF (TG_OP = 'INSERT') THEN
        DELETE FROM public.stock
        WHERE user_id = NEW.user_id AND chassis_no = NEW.chassis_no;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE: always restore to stock (individual item delete)
    IF (TG_OP = 'DELETE') THEN
        -- Restore deleted chassis to stock
        IF NOT EXISTS (SELECT 1 FROM public.stock WHERE user_id = OLD.user_id AND chassis_no = OLD.chassis_no) THEN
            INSERT INTO public.stock (user_id, model_name, chassis_no, engine_no, colour, price, gst, hsn, purchase_date, created_at, category)
            SELECT
                p.user_id,
                (item->>'modelName')::text,
                (item->>'chassisNo')::text,
                (item->>'engineNo')::text,
                (item->>'colour')::text,
                (item->>'price')::numeric,
                (item->>'gst')::text,
                (item->>'hsn')::text,
                p.invoice_date,
                NOW(),
                (item->>'category')::text
            FROM public.purchases p, jsonb_array_elements(p.items) as item
            WHERE p.user_id = OLD.user_id AND (item->>'chassisNo')::text = OLD.chassis_no
            LIMIT 1;
        END IF;
        
        RETURN OLD;
    END IF;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS delete_from_stock_on_sale ON public.vehicle_invoice_items;
CREATE TRIGGER delete_from_stock_on_sale
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_invoice_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_stock_deletion_on_sale();
